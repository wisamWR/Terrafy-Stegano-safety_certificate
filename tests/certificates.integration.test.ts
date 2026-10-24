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
    process.env.SEAL_SIGNING_KEY = randomBytes(32).toString("hex")

    let prisma: typeof import("../src/lib/prisma").default
    let registration: typeof import("../src/lib/certificates/registration")
    let transfer: typeof import("../src/lib/certificates/transfer")
    let approval: typeof import("../src/lib/certificates/approval")
    let queries: typeof import("../src/lib/certificates/queries")
    let notifications: typeof import("../src/lib/certificates/notifications")
    let verification: typeof import("../src/lib/certificates/verification")
    let payload: typeof import("../src/lib/certificates/payload")
    let Steganography: typeof import("../src/lib/steganography").Steganography
    let envelope: typeof import("../src/lib/seal/envelope")
    let verifySeal: typeof import("../src/lib/seal/verify").verifySeal
    let keyring: import("../src/lib/seal/public-keys").Keyring
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
        const reviewed = await approval.reviewCertificate(admin, created.certificate.id, "VERIFIED", undefined, storage, keyring)
        assert.ok(reviewed.success, JSON.stringify(reviewed))
        return prisma.certificate.findUniqueOrThrow({ where: { id: created.certificate.id } })
    }

    /** Replaces a certificate's v2 seal with a legacy v1 one (as issued before this feature). */
    async function downgradeToV1(certId: string): Promise<Buffer> {
        const cert = await prisma.certificate.findUniqueOrThrow({ where: { id: certId }, include: { owner: true } })
        const v1 = {
            certId,
            ownerId: cert.ownerId,
            ownerName: cert.owner.name,
            verifiedAt: cert.verifiedAt!.toISOString(),
            validator: "Admin",
            serial: cert.nomor_sertifikat,
            transactionType: "Initial Registration",
            history: [],
        }
        const image = await Steganography.embed(png(), payload.sealPayload(v1))
        const url = await storage.uploadVerified(`verified/legacy_${certId}.png`, image)
        await prisma.steganographyMetadata.update({
            where: { certificateId: certId },
            data: { sealVersion: 1, signingKeyId: null, signature: null, hashValue: payload.hashPayload(v1), stegoImage: url },
        })
        await prisma.certificate.update({ where: { id: certId }, data: { image_url: url, stegoImageUrl: url } })
        return image
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
        envelope = await import("../src/lib/seal/envelope")
        verifySeal = (await import("../src/lib/seal/verify")).verifySeal
        const sign = await import("../src/lib/seal/sign")
        keyring = {
            activeKid: "test-1",
            publicKeys: { "test-1": sign.publicKeyHexOf(sign.signingKeyFromSeed(process.env.SEAL_SIGNING_KEY!)) },
            revokedKids: [],
        }
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
            assert.equal(meta.sealVersion, 2)
            assert.equal(meta.signingKeyId, "test-1")

            const revealed = await Steganography.reveal(storage.verifiedImage(cert.image_url!))
            const parsed = envelope.parseEnvelope(revealed)
            assert.equal(parsed.kind, "v2")
            if (parsed.kind !== "v2") return
            assert.equal(meta.signature, parsed.envelope.sig)
            assert.deepEqual(await verifySeal(parsed.envelope, keyring), { valid: true, pub: parsed.envelope.pub })
            assert.equal(parsed.envelope.pub.serial, "SHM-001")
            assert.ok(!revealed.includes(alice.id), "owner id only inside the encrypted part")

            const secret = payload.openPayload(parsed.envelope.enc)!
            assert.equal(secret.ownerId, alice.id)
            assert.equal(payload.hashPayload(secret), meta.hashValue)

            assert.equal(await prisma.adminAuditLog.count({ where: { action: "APPROVE_CERT" } }), 1)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, type: "CERTIFICATE_VERIFIED" } }), 1)
        })

        it("refuses to approve without SEAL_SIGNING_KEY and changes nothing; approves normally once it is set", async () => {
            const saved = process.env.SEAL_SIGNING_KEY
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            let first
            try {
                delete process.env.SEAL_SIGNING_KEY
                first = await approval.reviewCertificate(admin, certificate.id, "VERIFIED", undefined, storage, keyring)
            } finally {
                process.env.SEAL_SIGNING_KEY = saved
            }
            assert.equal(first.success, false)
            assert.match((first as any).error, /SEAL_SIGNING_KEY/)
            assert.equal((await prisma.certificate.findUniqueOrThrow({ where: { id: certificate.id } })).status, "PENDING")
            assert.equal(await prisma.steganographyMetadata.count(), 0)
            assert.equal(storage.buckets.get("certificates")!.size, 0)
            assert.equal(storage.buckets.get("pending-uploads")!.size, 1)
            assert.equal(await prisma.notification.count({ where: { type: "CERTIFICATE_VERIFIED" } }), 0)

            assert.ok((await approval.reviewCertificate(admin, certificate.id, "VERIFIED", undefined, storage, keyring)).success)
            assert.equal((await prisma.steganographyMetadata.findUniqueOrThrow({ where: { certificateId: certificate.id } })).sealVersion, 2)
            assert.equal(await prisma.adminAuditLog.count({ where: { action: "APPROVE_CERT" } }), 1)
            assert.equal(await prisma.notification.count({ where: { userId: alice.id, type: "CERTIFICATE_VERIFIED" } }), 1)
        })

        it("rejects with a reason and does not seal", async () => {
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            const res = await approval.reviewCertificate(admin, certificate.id, "REJECTED", "Data tidak cocok", storage, keyring)
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

            assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage, keyring)).success)
            assert.equal(await prisma.steganographyMetadata.count(), 1)
            assert.equal(await prisma.history.count(), historyBefore)
        })

        it("re-approving an already sealed VERIFIED certificate is a no-op even without SEAL_SIGNING_KEY", async () => {
            const cert = await verifiedCertificateOf(alice)
            const saved = process.env.SEAL_SIGNING_KEY
            let res
            try {
                delete process.env.SEAL_SIGNING_KEY
                res = await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage, keyring)
            } finally {
                process.env.SEAL_SIGNING_KEY = saved
            }
            assert.ok(res.success, JSON.stringify(res))
        })

        it("refuses to seal from a location outside our storage", async () => {
            const { certificate } = (await registration.createCertificate(alice, input(), storage)) as any
            await prisma.certificate.update({ where: { id: certificate.id }, data: { image_url: "../../.env" } })
            const res = await approval.reviewCertificate(admin, certificate.id, "VERIFIED", undefined, storage, keyring)
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
            assert.equal((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage, keyring)).success, false)

            assert.ok((await transfer.acceptTransfer(bob, cert.id)).success)
            assert.equal((await transfer.acceptTransfer(bob, cert.id)).success, false, "cannot replay")

            assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage, keyring)).success)
            const after = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(after.ownerId, bob.id)
            assert.equal(after.status, "VERIFIED")
            assert.equal(after.transferToEmail, null)
            assert.notEqual(after.image_url, cert.image_url, "new seal image issued")
            assert.equal(await prisma.history.count({ where: { certificateId: cert.id, action: "Pengalihan Hak" } }), 1)

            const current = await verification.verifyCertificateImage(storage.verifiedImage(after.image_url!), storage, keyring)
            assert.ok(current.success)
            assert.equal(current.isOwnerMatch, true)
            assert.equal(current.ownerEmail, "bob@test.id")

            const stale = await verification.verifyCertificateImage(oldImage, storage, keyring)
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
                assert.ok((await approval.reviewCertificate(admin, cert.id, "VERIFIED", undefined, storage, keyring)).success)
            }
            await handOver(alice, bob)
            await handOver(bob, alice)

            const latest = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } })
            assert.equal(latest.ownerId, alice.id)

            const old = await verification.verifyCertificateImage(firstAliceImage, storage, keyring)
            assert.ok(old.success)
            assert.equal(old.isOwnerMatch, false, "first seal was superseded")

            const current = await verification.verifyCertificateImage(storage.verifiedImage(latest.image_url!), storage, keyring)
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
            assert.ok((await approval.reviewCertificate(admin, cert.id, "REJECTED", undefined, storage, keyring)).success)

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
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage, keyring)
            assert.ok(res.success)
            assert.equal(res.isOwnerMatch, true)
            assert.equal(res.certificate.nomor, "SHM-001")
        })

        it("rejects an image with a forged plain-JSON payload", async () => {
            const cert = await verifiedCertificateOf(alice)
            const forged = await Steganography.embed(png(), JSON.stringify({ certId: cert.id, ownerId: bob.id, serial: "SHM-001" }))
            const res = await verification.verifyCertificateImage(forged, storage, keyring)
            assert.equal(res.success, false)
        })

        it("rejects a payload sealed with the old public default key", async () => {
            const cert = await verifiedCertificateOf(alice)
            const legacyKey = Buffer.from("a".repeat(64), "hex")
            const sealed = payload.sealPayload(
                { certId: cert.id, ownerId: bob.id, ownerName: "bob", verifiedAt: new Date().toISOString(), validator: "x", serial: "SHM-001", transactionType: "x", history: [] },
                legacyKey,
            )
            const res = await verification.verifyCertificateImage(await Steganography.embed(png(), sealed), storage, keyring)
            assert.equal(res.success, false)
        })

        it("detects a single flipped bit in the hidden ciphertext", async () => {
            const cert = await verifiedCertificateOf(alice)
            const stored = storage.verifiedImage(cert.image_url!)
            const text = await Steganography.reveal(stored)
            // Pick a decimal digit inside `enc`: flipping bit 0 keeps it a digit (0<->1, 2<->3...), so the
            // envelope still parses and only the signature check can catch the change.
            const encStart = text.indexOf('"enc":"') + 7
            let index = encStart + 60
            while (!/[0-9]/.test(text[index])) index++
            // Embedded stream: 7-byte magic + 4-byte length, then the ASCII envelope (1 byte = 8 channels)
            const byte = 11 + index
            const ch = byte * 8
            const img = PNG.sync.read(stored)
            img.data[Math.floor(ch / 3) * 4 + (ch % 3)] ^= 1
            const res = await verification.verifyCertificateImage(PNG.sync.write(img), storage, keyring)
            assert.equal(res.success, false)
            assert.match((res as any).error, /Tanda tangan digital tidak valid/)
        })

        it("reports seal info for a v2 seal", async () => {
            const cert = await verifiedCertificateOf(alice)
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage, keyring)
            assert.ok(res.success)
            assert.deepEqual(res.seal, { version: 2, signed: true, kid: "test-1", issuedAt: cert.verifiedAt!.toISOString() })
        })

        it("rejects a v2 seal signed with an unknown key", async () => {
            const cert = await verifiedCertificateOf(alice)
            const other = { activeKid: "test-1", publicKeys: { "test-1": "11".repeat(32) }, revokedKids: [] }
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage, other)
            assert.equal(res.success, false)
            assert.match((res as any).error, /Tanda tangan digital tidak valid/)
        })

        it("rejects a v2 seal whose kid was revoked", async () => {
            const cert = await verifiedCertificateOf(alice)
            const revoked = { ...keyring, revokedKids: ["test-1"] }
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage, revoked)
            assert.equal(res.success, false)
            assert.match((res as any).error, /dicabut/)
        })

        it("still verifies a legacy v1 seal and labels it", async () => {
            const cert = await verifiedCertificateOf(alice)
            const legacyImage = await downgradeToV1(cert.id)
            const res = await verification.verifyCertificateImage(legacyImage, storage, keyring)
            assert.ok(res.success)
            assert.equal(res.isOwnerMatch, true)
            assert.deepEqual(res.seal, { version: 1, signed: false })
        })

        it("marks a genuine seal of a revoked certificate as not current", async () => {
            const cert = await verifiedCertificateOf(alice)
            assert.ok((await approval.reviewCertificate(admin, cert.id, "REJECTED", "Dicabut", storage, keyring)).success)
            const res = await verification.verifyCertificateImage(storage.verifiedImage(cert.image_url!), storage, keyring)
            assert.ok(res.success)
            assert.equal(res.status, "REJECTED")
            assert.equal(res.isOwnerMatch, false)
        })

        it("rejects an image with no hidden data", async () => {
            const res = await verification.verifyCertificateImage(png(), storage, keyring)
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
