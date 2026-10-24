import prisma from "@/lib/prisma"
import { Steganography } from "@/lib/steganography"
import { serializeEnvelope, type SealPublic } from "@/lib/seal/envelope"
import { DEFAULT_KEYRING, type Keyring } from "@/lib/seal/public-keys"
import { signSeal } from "@/lib/seal/sign"
import { hashPayload, sealPayload, type SealPrivate } from "./payload"
import { type CertificateStorage, type ImageSource, readImage, resolveImageSource } from "./storage"

/** Certificate with everything a seal needs. Null if it does not exist. */
export function loadSealSubject(certId: string) {
    return prisma.certificate.findUnique({
        where: { id: certId },
        include: {
            owner: { select: { name: true } },
            history: { orderBy: { createdAt: "asc" }, select: { action: true, owner_name: true, createdAt: true } },
            steganographyMetadata: { select: { id: true, sealVersion: true }, take: 1 },
        },
    })
}

export type SealSubject = NonNullable<Awaited<ReturnType<typeof loadSealSubject>>>

export type SealedImage = {
    publicUrl: string
    source: ImageSource
    metadata: {
        sealVersion: 2
        signingKeyId: string
        signature: string
        hashValue: string
        algorithm: string
        encryptionAlgo: string
        encryptionKey: string
    }
}

/**
 * Builds a signed v2 envelope, hides it in the certificate's current image and uploads the result.
 * Signs before uploading, so a key problem never leaves a half-issued seal behind.
 * Writes nothing to the database: callers decide whether to create or replace metadata.
 */
export async function createSealedImage(
    validatorName: string,
    cert: SealSubject,
    storage: CertificateStorage,
    keyring: Keyring = DEFAULT_KEYRING,
): Promise<SealedImage> {
    if (!cert.image_url) throw new Error("Sertifikat tidak memiliki gambar")
    const source = resolveImageSource(cert.image_url)
    if (!source) throw new Error("Lokasi gambar sertifikat tidak dikenali atau tidak diizinkan")

    const pub: SealPublic = {
        certId: cert.id,
        serial: cert.nomor_sertifikat,
        verifiedAt: (cert.verifiedAt ?? new Date()).toISOString(),
        issuer: "Terrafy",
        kid: keyring.activeKid,
    }
    const secret: SealPrivate = {
        ownerId: cert.ownerId,
        ownerName: cert.owner.name,
        validator: validatorName,
        transactionType: cert.transferReason || "Initial Registration",
        history: cert.history.map((h) => ({ a: h.action, o: h.owner_name, d: h.createdAt.toISOString() })),
    }

    const enc = sealPayload(secret)
    const sig = signSeal(pub, enc, keyring)
    const cover = await readImage(storage, source)
    const stego = await Steganography.embed(cover, serializeEnvelope({ v: 2, pub, enc, sig }))

    const objectPath = `verified/verified_${Date.now()}_${cert.nomor_sertifikat.replace(/[^a-z0-9]/gi, "_")}.png`
    const publicUrl = await storage.uploadVerified(objectPath, stego)

    return {
        publicUrl,
        source,
        metadata: {
            sealVersion: 2,
            signingKeyId: pub.kid,
            signature: sig,
            hashValue: hashPayload(secret),
            algorithm: "LSB (RGB)",
            encryptionAlgo: "AES-256-GCM",
            encryptionKey: "PROTECTED",
        },
    }
}
