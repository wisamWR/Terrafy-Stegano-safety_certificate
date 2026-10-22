import type { Prisma } from "@prisma/client"
import type { AuthUser } from "@/lib/auth-guard"

export type Actor = Pick<AuthUser, "id" | "name" | "email" | "role">

export type Failure = { success?: false; error: string; code?: string; message?: string; details?: unknown }

/**
 * What a server action hands to the UI: either the success payload or a Failure, typed so the
 * UI can read `result.success`, `result.error` and any payload field without narrowing first.
 */
export type ActionResult<S> =
    | (S & { error?: undefined; code?: undefined; message?: string; details?: undefined })
    | (Failure & { [K in Exclude<keyof S, keyof Failure>]?: undefined })

export const fail = (error: string, extra: { code?: string; message?: string; details?: unknown } = {}) =>
    ({ success: false as const, error, ...extra })

export const isAdmin = (actor: Actor | null | undefined) => actor?.role === "ADMIN"

/**
 * Older builds archived superseded rows by tagging the serial number. Nothing writes these
 * markers any more, but existing rows may carry them, so every listing keeps hiding them.
 */
export const notArchived: Prisma.CertificateWhereInput = {
    AND: [
        { nomor_sertifikat: { not: { contains: "_REJECTED_" } } },
        { nomor_sertifikat: { not: { contains: "_PENDING_OVERWRITE_" } } },
    ],
}

export type UploadedFile = { buffer: Buffer; type: string; name: string }

export type CertificateInput = {
    nomorSertifikat: string
    namaSertifikat: string
    luasTanah: string
    alamat: string
    keterangan: string
    asalHak: string
    file?: UploadedFile | null
}

export const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024

/** Certificates must be PNG: lossy formats would destroy the LSB payload. Checks magic bytes, not just MIME. */
export function validateCertificateImage(file: UploadedFile): string | null {
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    if (file.type !== "image/png" || !file.buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return "Format file tidak didukung. Harap upload gambar format .PNG (Portable Network Graphics) untuk keamanan steganografi."
    }
    if (file.buffer.length > MAX_CERTIFICATE_BYTES) {
        return "Ukuran file maksimal 10 MB."
    }
    return null
}
