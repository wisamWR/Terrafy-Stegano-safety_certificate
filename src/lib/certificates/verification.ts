import prisma from "@/lib/prisma"
import { Steganography } from "@/lib/steganography"
import { parseEnvelope } from "@/lib/seal/envelope"
import { DEFAULT_KEYRING, type Keyring } from "@/lib/seal/public-keys"
import { verifySeal, type SealRejection } from "@/lib/seal/verify"
import { fail } from "./common"
import { hashPayload, openPayload } from "./payload"
import { PENDING_PREFIX, type CertificateStorage } from "./storage"

export type SealInfo = { version: 1 | 2; signed: boolean; kid?: string; issuedAt?: string }

const SIGNATURE_ERRORS: Record<SealRejection, string> = {
    bad_signature: "Tanda tangan digital tidak valid. Gambar telah diubah atau tidak diterbitkan oleh Terrafy.",
    unknown_kid: "Tanda tangan digital tidak valid: kunci penanda tangan tidak dikenali.",
    revoked_kid: "Kunci penanda tangan sertifikat ini telah dicabut.",
    verifier_unavailable: "Verifikasi tanda tangan tidak dapat dijalankan di server (konfigurasi kunci publik bermasalah). Hubungi administrator.",
}

const UNREADABLE = "Gagal memproses data sertifikat. Gambar mungkin rusak, dipalsukan, atau menggunakan kunci enkripsi yang berbeda."

type Hidden = { certId: string; ownerId: unknown; serial: unknown; ownerName: unknown }
type CurrentSeal = { hashValue: string | null; signature: string | null } | undefined

/**
 * Online check of an uploaded certificate image:
 *  v2: verify the Ed25519 signature, decrypt the private part, compare with the database;
 *      "latest seal" = stored signature equals the image's signature.
 *  v1: legacy AES-only seal; "latest seal" = stored hash equals the payload hash.
 * An authentic seal that is not current (ownership moved on, newer seal, revoked) is reported
 * with isOwnerMatch=false and owner details withheld.
 */
export async function verifyCertificateImage(image: Buffer, storage: CertificateStorage, keyring: Keyring = DEFAULT_KEYRING) {
    let revealed: string
    try {
        revealed = await Steganography.reveal(image)
    } catch {
        return fail("Tidak ditemukan data tersembunyi. Sertifikat mungkin bukan asli atau gambar telah dimodifikasi.", { code: "NO_SEAL" })
    }

    const parsed = parseEnvelope(revealed)
    let hidden: Hidden
    let seal: SealInfo
    let isLatestSeal: (current: CurrentSeal) => boolean

    if (parsed.kind === "v2") {
        const verdict = await verifySeal(parsed.envelope, keyring)
        if (!verdict.valid) {
            // Server misconfiguration (not a forged seal): make it visible to operators
            if (verdict.reason === "verifier_unavailable") console.error("[VERIFY] Signature verifier unavailable (keyring or WebCrypto problem)")
            return fail(SIGNATURE_ERRORS[verdict.reason], { code: verdict.reason.toUpperCase() })
        }

        const secret = openPayload(parsed.envelope.enc)
        if (!secret) {
            console.error("[VERIFY] Valid signature but the encrypted part cannot be opened (encryption key mismatch?)", { certId: parsed.envelope.pub.certId })
            return fail("Tanda tangan asli, tetapi data terenkripsi tidak dapat dibuka (kunci enkripsi server berbeda).", { code: "FAIL_DECRYPT" })
        }
        const { pub, sig } = parsed.envelope
        hidden = { certId: pub.certId, serial: pub.serial, ownerId: secret.ownerId, ownerName: secret.ownerName }
        seal = { version: 2, signed: true, kid: pub.kid, issuedAt: pub.verifiedAt }
        // Fail closed: a v2 seal always writes its metadata row; a missing row means a transfer removed it and re-sealing failed
        isLatestSeal = (current) => current?.signature === sig
    } else if (parsed.kind === "v1") {
        const legacy = openPayload(parsed.sealed)
        if (!legacy) return fail(UNREADABLE, { code: "FAIL_DECRYPT_OR_PARSE" })
        if (typeof legacy.certId !== "string" || !legacy.certId) return fail("Data sertifikat tidak lengkap dalam gambar.")
        hidden = { certId: legacy.certId, serial: legacy.serial, ownerId: legacy.ownerId, ownerName: legacy.ownerName }
        seal = { version: 1, signed: false }
        isLatestSeal = (current) => !current?.hashValue || current.hashValue === hashPayload(legacy)
    } else {
        return fail(UNREADABLE, { code: "FAIL_DECRYPT_OR_PARSE" })
    }

    const certificate = await prisma.certificate.findUnique({
        where: { id: hidden.certId },
        include: {
            owner: { select: { name: true, email: true } },
            history: { orderBy: { createdAt: "desc" } },
            steganographyMetadata: { select: { hashValue: true, signature: true }, take: 1 },
        },
    })

    if (!certificate || certificate.nomor_sertifikat !== hidden.serial) {
        if (seal.signed) {
            // Expected when the certificate or its account was deleted after sealing
            console.info("[VERIFY] Valid signature but no matching certificate", { certId: hidden.certId, serial: hidden.serial })
            return fail("Tanda tangan asli, tetapi data sertifikat tidak cocok dengan database.", { code: "SEAL_DATA_MISMATCH" })
        }
        if (!certificate) return fail("Sertifikat tidak ditemukan di database (ID tidak valid).", { code: "CERT_NOT_FOUND" })
        return fail("Data tidak cocok! Nomor sertifikat dalam gambar berbeda dengan database.", { code: "SERIAL_MISMATCH" })
    }

    const isCurrent =
        certificate.ownerId === hidden.ownerId &&
        isLatestSeal(certificate.steganographyMetadata[0]) &&
        certificate.status !== "REJECTED"

    const ownerName = isCurrent ? (certificate.owner.name || certificate.owner.email) : "Terproteksi (Pemilik Telah Berubah)"
    const ownerEmail = isCurrent ? certificate.owner.email : "Privasi Dilindungi"

    // A stale seal must never lead to the current image (it would reveal the current owner's details)
    let imageUrl: string | null = "/placeholder_secure.png"
    if (isCurrent) {
        imageUrl = certificate.image_url
        if (imageUrl?.startsWith(PENDING_PREFIX)) {
            imageUrl = (await storage.signPendingUrl(imageUrl.slice(PENDING_PREFIX.length), 3600)) ?? imageUrl
        }
    }

    const history = (isCurrent ? certificate.history : []).map((h) => ({
        name: h.owner_name || h.actor_name,
        email: h.owner_email || h.actor_email,
        type: h.action,
        date: h.createdAt.toLocaleDateString("id-ID"),
        note: h.note,
    }))

    return {
        success: true as const,
        isOwnerMatch: isCurrent,
        imageOwnerName: typeof hidden.ownerName === "string" ? hidden.ownerName : "Tidak diketahui",
        ownerName,
        ownerEmail,
        status: certificate.status,
        seal,
        certificate: {
            id: certificate.id,
            nama: certificate.nama_lahan,
            nomor: certificate.nomor_sertifikat,
            luas: certificate.luas_tanah,
            location: certificate.lokasi,
            keterangan: certificate.keterangan,
            image_url: imageUrl,
            ownerName,
            ownerEmail,
            status: certificate.status,
            history,
            transferReason: certificate.transferReason,
            conflicts: [],
            createdAt: certificate.createdAt,
            updatedAt: certificate.updatedAt,
        },
    }
}
