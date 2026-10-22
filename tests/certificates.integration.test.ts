// Integration tests for the certificate services against a real PostgreSQL database.
// Requires TEST_DATABASE_URL (a throwaway database: every test wipes all tables).
//   TEST_DATABASE_URL=postgresql://postgres@localhost:55432/terrafy_test npm run test:integration

import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomBytes, randomFillSync } from "node:crypto"
import { PNG } from "pngjs"

const TEST_DB = process.env.TEST_DATABASE_URL
const SUPABASE_URL = "https://test-project.supabase.co"

if (!TEST_DB) {
    describe("certificate services (integration)", () => {
        it("skipped: set TEST_DATABASE_URL to run", { skip: true }, () => {})
    })
} else {
    // Must be set before any module that reads them is imported
    process.env.DATABASE_URL = TEST_DB
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
    process.env.STEGANOGRAPHY_KEY = randomBytes(32).toString("hex")
    delete process.env.ALLOW_LEGACY_STEGO_KEY

    let prisma: typeof import("../src/lib/prisma").default
    let registration: typeof import("../src/lib/certificates/registration")
    let transfer: typeof import("../src/lib/certificates/transfer")
    let approval: typeof import("../src/lib/certificates/approval")
    let queries: typeof import("../src/lib/certificates/queries")
    let notifications: typeof import("../src/lib/certificates/notifications")
    let verification: typeof import("../src/lib/certificates/verification")
    let payload: typeof import("../src/lib/certificates/payload")
    let Steganography: typeof import("../src/lib/steganography").Steganography
    type Actor = import("../src/lib/certificates/common").Actor
    type CertificateStorage = import("../src/lib/certificates/storage").CertificateStorage

    /** In-memory stand-in for the Supabase buckets. */
    class FakeStorage implements CertificateStorage {
        buckets = new Map<string, Map<string, Buffer>>([["pending-uploads", new Map()], ["certificates", new Map()]])
        async uploadPending(name: string, data: Buffer) { this.buckets.get("pending-uploads")!.set(name, data) }
        async removePending(name: string) { this.buckets.get("pending-uploads")!.delete(name) }
        async signPendingUrl(name: string) { return `${SUPABASE_URL}/storage/v1/object/sign/pending-uploads/${name}?token=t` }
        async uploadVerified(path: string, data: Buffer) {
            this.buckets.get("certificates")!.set(path, data)
            return `${SUPABASE_URL}/storage/v1/object/public/certificates/${path}`
        }
        async download(bucket: string, path: string) {
            const data = this.buckets.get(bucket)?.get(path)
            if (!data) throw new Error(`missing ${bucket}/${path}`)
            return data
        }
        verifiedImage(url: string) {
            const path = url.split("/public/certificates/")[1]
            return this.buckets.get("certificates")!.get(decodeURIComponent(path))!
        }
    }

    const png = (w = 120, h = 120) => {
        const img = new PNG({ width: w, height: h })
        randomFillSync(img.data)
        return PNG.sync.write(img)
    }

    const input = (over: Record<string, unknown> = {}) => ({
        nomorSertifikat: "SHM-001",
        namaSertifikat: "Sawah Utara",
        luasTanah: "1200",
        alamat: "Desa Sukamaju",
        keterangan: "",
        asalHak: "Jual Beli",
        file: { buffer: png(), type: "image/png", name: "cert.png" },
        ...over,
    })

    let storage: FakeStorage
    let alice: Actor, bob: Actor, carol: Actor, admin: Actor

    async function makeUser(email: string, role: "USER" | "ADMIN" = "USER"): Promise<Actor> {
        return prisma.user.create({
            data: { email, name: email.split("@")[0], password: "x", role },
            select: { id: true, name: true, email: true, role: true },
        })
    }

    async function verifiedCertificateOf(owner: Actor, nomor = "SHM-001") {
        const created = await registration.createCertificate(owner, input({ nomorSertifikat: nomor }), storage)
        assert.ok(created.success, JSON.stringify(created))
        const reviewed = await approval.reviewCertificate(admin, created.certificate.id, "VERIFIED", undefined, storage)
        assert.ok(reviewed.success, JSON.stringify(reviewed))
        return prisma.certificate.findUniqueOrThrow({ where: { id: created.certificate.id } })
    }

    before(async () => {
        prisma = (await import("../src/lib/prisma")).default
        registration = await import("../src/lib/certificates/registration")
        transfer = await import("../src/lib/certificates/transfer")
        approval = await import("../src/lib/certificates/approval")
        queries = await import("../src/lib/certificates/queries")
        notifications = await import("../src/lib/certificates/notifications")
        verification = await import("../src/lib/certificates/verification")
        payload = await import("../src/lib/certificates/payload")
        Steganography = (await import("../src/lib/steganography")).Steganography
    })

    beforeEach(async () => {
        await prisma.$executeRawUnsafe(
            `TRUNCATE "admin_audit_logs", "notifications", "steganography_metadata", "histories", "certificates", "users" CASCADE`,
        )
        storage = new FakeStorage()
        alice = await makeUser("alice@test.id")
        bob = await makeUser("bob@test.id")
        carol = await makeUser("carol@test.id")
        admin = await makeUser("admin@test.id", "ADMIN")
    })

    after(async () => {
        await prisma.$disconnect()
    })

    describe("registration", () => {
        it("creates a PENDING certificate with history, notification and a private upload", async () => {
            const res = await registration.createCertificate(alice, input(), storage)
            assert.ok(res.success)
            const cert = res.certificate
            assert.equal(cert.status, "PENDING")
            assert.equal(cert.luas_tanah, "1200 m2")
            assert.match(cert.image_url!, /^pending-uploads\/pending_/)
            assert.equal(storage.buckets.get("pending-uploads")!.size, 1)
            assert.equal(await prisma.history.count({ where: { certificateId: cert.id, action: "Pendaftaran" } }), 1)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, type: "CERTIFICATE_PENDING" } }), 1)
        })

        it("rejects non-PNG files by content, not just MIME type", async () => {
            const fake = { buffer: Buffer.from("GIF89a....."), type: "image/png", name: "x.png" }
            const res = await registration.createCertificate(alice, input({ file: fake }), storage)
            assert.equal(res.success, false)
            assert.equal(await prisma.certificate.count(), 0)
        })

        it("rejects missing required fields", async () => {
            const res = await registration.createCertificate(alice, input({ alamat: "  " }), storage)
            assert.equal(res.success, false)
        })

        it("blocks a number that is already VERIFIED but allows parallel PENDING claims", async () => {
            assert.ok((await registration.createCertificate(bob, input(), storage)).success)
            await verifiedCertificateOf(alice)
            const dup = await registration.createCertificate(carol, input(), storage)
            assert.equal(dup.success, false)
            assert.equal((dup as any).error, "DUPLICATE_NUMBER")
        })

        it("only lets the owner edit a PENDING certificate and keeps new images private", async () => {
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            assert.equal((await registration.updateCertificate(bob, certificate.id, input(), storage)).success, false)

            const res = await registration.updateCertificate(alice, certificate.id, input({ namaSertifikat: "Baru" }), storage)
            assert.ok(res.success)
            assert.equal(res.certificate.nama_lahan, "Baru")
            assert.match(res.certificate.image_url!, /^pending-uploads\//)
            assert.equal(storage.buckets.get("pending-uploads")!.size, 1, "old pending image is removed")
        })

        it("deletes only own PENDING/REJECTED certificates and cascades related rows", async () => {
            const verified = await verifiedCertificateOf(alice, "SHM-V")
            assert.equal((await registration.deleteCertificate(alice, verified.id, storage)).success, false)

            const { certificate } = (await registration.createCertificate(alice, input({ nomorSertifikat: "SHM-P" }), storage)) as any
            assert.equal((await registration.deleteCertificate(bob, certificate.id, storage)).success, false)
            assert.ok((await registration.deleteCertificate(alice, certificate.id, storage)).success)
            assert.equal(await prisma.history.count({ where: { certificateId: certificate.id } }), 0)
        })
    })

    describe("approval and sealing", () => {
        it("verifies, embeds an encrypted seal and moves the image to the verified bucket", async () => {
            const cert = await verifiedCertificateOf(alice)
            assert.equal(cert.status, "VERIFIED")
            assert.equal(cert.verifiedBy, admin.id)
            assert.match(cert.image_url!, /\/public\/certificates\/verified\//)
            assert.equal(cert.stegoImageUrl, cert.image_url)
            assert.equal(storage.buckets.get("pending-uploads")!.size, 0, "pending file cleaned up")

            const meta = await prisma.steganographyMetadata.findUniqueOrThrow({ where: { certificateId: cert.id } })
            assert.equal(meta.encryptionAlgo, "AES-256-GCM")

            const revealed = await Steganography.reveal(storage.verifiedImage(cert.image_url!))
            assert.ok(!revealed.includes(alice.id), "payload is not plaintext")
            const opened = payload.openPayload(revealed)!
            assert.equal(opened.ownerId, alice.id)
            assert.equal(payload.hashPayload(opened), meta.hashValue)

            assert.equal(await prisma.adminAuditLog.count({ where: { action: "APPROVE_CERT" } }), 1)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, type: "CERTIFICATE_VERIFIED" } }), 1)
        })

        it("rejects with a reason and does not seal", async () => {
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            const res = await approval.reviewCertificate(admin, certificate.id, "REJECTED", "Data tidak cocok", storage)
            assert.ok(res.success)
            const cert = await prisma.certificate.findUniqueOrThrow({ where: { id: certificate.id } })
            assert.equal(cert.status, "REJECTED")
            assert.equal(cert.rejectionReason, "Data tidak cocok")
            assert.equal(await prisma.steganographyMetadata.count(), 0)
        })

        it("re-approving a VERIFIED certificate without seal retries the seal, without duplicate history", async () => {
            const cert = await verifiedCertificateOf(alice)
            await prisma.steganographyMetadata.deleteMany()
            const historyBefore = await prisma.history.count()

            assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage)).success)
            assert.equal(await prisma.steganographyMetadata.count(), 1)
            assert.equal(await prisma.history.count(), historyBefore)
        })

        it("refuses to seal from a location outside our storage", async () => {
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            await prisma.certificate.update({ where: { id: certificate.id }, data: { image_url: "../../.env" } })
            const res = await approval.reviewCertificate(admin, certificate.id, "VERIFIED", undefined, storage)
            assert.equal(res.success, false)
            assert.match((res as any).error, /tidak diizinkan/)
        })
    })

    describe("viewing", () => {
        it("lets owner and admin view a certificate, but not other users", async () => {
            const cert = await verifiedCertificateOf(alice)
            assert.ok((await queries.getCertificateDetail(alice, cert.id, storage)).success)
            assert.ok((await queries.getCertificateDetail(admin, cert.id, storage)).success)
            assert.equal((await queries.getCertificateDetail(bob, cert.id, storage)).success, false)
        })

        it("returns the seal metadata under the camelCase keys the UI reads", async () => {
            const cert = await verifiedCertificateOf(alice)
            const res = await queries.getCertificateDetail(alice, cert.id, storage)
            assert.ok(res.success)
            assert.equal(res.certificate.steganographyMetadata?.stegoImage, cert.image_url)
        })

        it("never exposes the owner's password hash in history detail", async () => {
            const cert = await verifiedCertificateOf(alice)
            const h = await prisma.history.findFirstOrThrow({ where: { certificateId: cert.id } })
            const res = await queries.getHistoryDetail(h.id)
            assert.ok(res.success)
            assert.equal("password" in res.history.certificate.owner, false)
        })

        it("computes admin stats and duplicate counts", async () => {
            await verifiedCertificateOf(alice, "SHM-A")
            await registration.createCertificate(bob, input({ nomorSertifikat: "SHM-B" }), storage)
            await registration.createCertificate(carol, input({ nomorSertifikat: "SHM-B" }), storage)

            const stats = await queries.getAdminStats()
            assert.deepEqual(
                { total: stats.stats.total, pending: stats.stats.pending, verified: stats.stats.verified, users: stats.stats.users },
                { total: 3, pending: 2, verified: 1, users: 3 },
            )
            const all = await queries.listAllCertificates()
            assert.deepEqual(all.certificates.map((c) => c.duplicateCount).sort(), [0, 2, 2])
        })
    })

    describe("transfer flow", () => {
        it("runs request -> recipient accepts -> admin approves, and re-seals for the new owner", async () => {
            const cert = await verifiedCertificateOf(alice)
            const oldImage = storage.verifiedImage(cert.image_url!)

            assert.ok((await transfer.requestTransfer(alice, cert.id, "bob@test.id", "Jual Beli")).success)
            // Recipient can now see it, a third user still cannot
            assert.ok((await queries.getCertificateDetail(bob, cert.id, storage)).success)
            assert.equal((await queries.getCertificateDetail(carol, cert.id, storage)).success, false)

            assert.equal((await transfer.acceptTransfer(carol, cert.id)).success, false)
            // Admin cannot jump in before the recipient answered
            assert.equal((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage)).success, false)

            assert.ok((await transfer.acceptTransfer(bob, cert.id)).success)
            assert.equal((await transfer.acceptTransfer(bob, cert.id)).success, false, "cannot replay")

            assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage)).success)
            const after = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(after.ownerId, bob.id)
            assert.equal(after.status, "VERIFIED")
            assert.equal(after.transferToEmail, null)
            assert.notEqual(after.image_url, cert.image_url, "new seal image issued")
            assert.equal(await prisma.history.count({ where: { certificateId: cert.id, action: "Pengalihan Hak" } }), 1)

            const current = await verification.verifyCertificateImage(storage.verifiedImage(after.image_url!), storage)
            assert.ok(current.success)
            assert.equal(current.isOwnerMatch, true)
            assert.equal(current.ownerEmail, "bob@test.id")

            const stale = await verification.verifyCertificateImage(oldImage, storage)
            assert.ok(stale.success)
            assert.equal(stale.isOwnerMatch, false)
            assert.equal(stale.ownerEmail, "Privasi Dilindungi")
            assert.deepEqual(stale.certificate.history, [])
        })

        it("treats a superseded seal as not current even when ownership came back (A -> B -> A)", async () => {
            const cert = await verifiedCertificateOf(alice)
            const firstAliceImage = storage.verifiedImage(cert.image_url!)

            const handOver = async (from: Actor, to: Actor) => {
                assert.ok((await transfer.requestTransfer(from, cert.id, to.email, "Jual Beli")).success)
                assert.ok((await transfer.acceptTransfer(to, cert.id)).success)
                assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage)).success)
            }
            await handOver(alice, bob)
            await handOver(bob, alice)

            const latest = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(latest.ownerId, alice.id)

            const old = await verification.verifyCertificateImage(firstAliceImage, storage)
            assert.ok(old.success)
            assert.equal(old.isOwnerMatch, false, "first seal was superseded")

            const current = await verification.verifyCertificateImage(storage.verifiedImage(latest.image_url!), storage)
            assert.ok(current.success)
            assert.equal(current.isOwnerMatch, true)
        })

        it("lets the recipient decline, returning the certificate to its owner", async () => {
            const cert = await verifiedCertificateOf(alice)
            await transfer.requestTransfer(alice, cert.id, "bob@test.id", "Hibah")
            assert.equal((await transfer.rejectTransfer(carol, cert.id)).success, false)
            assert.ok((await transfer.rejectTransfer(bob, cert.id)).success)

            const after = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(after.status, "VERIFIED")
            assert.equal(after.ownerId, alice.id)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, title: "Transfer Ditolak Penerima" } }), 1)
            assert.equal(await prisma.notification.count({ where: { userId: bob.id, type: "TRANSFER_REQUEST" } }), 0)
        })

        it("lets the admin cancel a confirmed transfer", async () => {
            const cert = await verifiedCertificateOf(alice)
            await transfer.requestTransfer(alice, cert.id, "bob@test.id", "Jual Beli")
            await transfer.acceptTransfer(bob, cert.id)
            assert.ok((await approval.reviewCertificate(admin, cert.id, "REJECTED", undefined, storage)).success)

            const after = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(after.status, "VERIFIED")
            assert.equal(after.ownerId, alice.id)
            assert.equal(await prisma.history.count({ where: { action: "Pembatalan Transfer" } }), 1)
        })

        it("rejects transfers by non-owners, of unverified certificates, to self, or to unknown users", async () => {
            const cert = await verifiedCertificateOf(alice)
            assert.equal((await transfer.requestTransfer(bob, cert.id, "carol@test.id", "x")).success, false)
            assert.equal((await transfer.requestTransfer(alice, cert.id, "ALICE@test.id", "x")).success, false)
            assert.equal((await transfer.requestTransfer(alice, cert.id, "nobody@test.id", "x")).success, false)
            const { certificate } = (await registration.createCertificate(alice, input({ nomorSertifikat: "SHM-P" }), storage)) as any
            assert.equal((await transfer.requestTransfer(alice, certificate.id, "bob@test.id", "x")).success, false)
        })
    })

    describe("public verification", () => {
        it("accepts a genuine sealed image", async () => {
            const cert = await verifiedCertificateOf(alice)
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage)
            assert.ok(res.success)
            assert.equal(res.isOwnerMatch, true)
            assert.equal(res.certificate.nomor, "SHM-001")
        })

        it("rejects an image with a forged plain-JSON payload", async () => {
            const cert = await verifiedCertificateOf(alice)
            const forged = await Steganography.embed(png(), JSON.stringify({ certId: cert.id, ownerId: bob.id, serial: "SHM-001" }))
            const res = await verification.verifyCertificateImage(forged, storage)
            assert.equal(res.success, false)
        })

        it("rejects a payload sealed with the old public default key", async () => {
            const cert = await verifiedCertificateOf(alice)
            const legacyKey = Buffer.from("a".repeat(64), "hex")
            const sealed = payload.sealPayload(
                { certId: cert.id, ownerId: bob.id, ownerName: "bob", verifiedAt: new Date().toISOString(), validator: "x", serial: "SHM-001", transactionType: "x", history: [] },
                legacyKey,
            )
            const res = await verification.verifyCertificateImage(await Steganography.embed(png(), sealed), storage)
            assert.equal(res.success, false)
        })

        it("detects a single flipped bit in the hidden ciphertext", async () => {
            const cert = await verifiedCertificateOf(alice)
            const img = PNG.sync.read(storage.verifiedImage(cert.image_url!))
            // Channel 1000 lies inside the ciphertext (header is 88 channels, iv+tag ~ 470)
            const idx = Math.floor(1000 / 3) * 4 + (1000 % 3)
            img.data[idx] ^= 1
            const res = await verification.verifyCertificateImage(PNG.sync.write(img), storage)
            assert.equal(res.success, false)
        })

        it("rejects an image with no hidden data", async () => {
            const res = await verification.verifyCertificateImage(png(), storage)
            assert.equal(res.success, false)
        })
    })

    describe("notifications", () => {
        it("lists and marks only the caller's own notifications", async () => {
            await registration.createCertificate(alice, input(), storage)
            const aliceList = await notifications.listNotifications(alice)
            assert.equal(aliceList.notifications.length, 1)
            assert.equal(aliceList.notifications[0].certNo, "SHM-001")

            const id = aliceList.notifications[0].id
            assert.equal((await notifications.markNotificationRead(bob, id)).updated, 0)
            assert.equal((await notifications.markNotificationRead(alice, id)).updated, 1)

            await notifications.markAllNotificationsRead(bob)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, isRead: true } }), 1)
        })
    })
}
