import { readFile } from "fs/promises"
import path from "path"

export const PENDING_BUCKET = "pending-uploads"
export const VERIFIED_BUCKET = "certificates"
export const PENDING_PREFIX = `${PENDING_BUCKET}/`

/** Storage operations certificate flows need. Swappable so the flows can be tested without Supabase. */
export interface CertificateStorage {
    uploadPending(name: string, data: Buffer, contentType: string): Promise<void>
    removePending(name: string): Promise<void>
    signPendingUrl(name: string, expiresInSeconds: number): Promise<string | null>
    /** Uploads to the public verified bucket and returns the public URL. */
    uploadVerified(objectPath: string, data: Buffer): Promise<string>
    download(bucket: string, objectPath: string): Promise<Buffer>
}

export type ImageSource =
    | { kind: "bucket"; bucket: string; path: string }
    | { kind: "local"; filePath: string }

/**
 * Maps a stored image_url to where its bytes live. Only our own buckets and files under
 * public/uploads are accepted: arbitrary URLs would let the server fetch attacker-chosen
 * hosts (SSRF) and arbitrary paths could read files outside public/ (e.g. .env).
 */
export function resolveImageSource(imageUrl: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): ImageSource | null {
    if (!imageUrl) return null

    if (imageUrl.startsWith(PENDING_PREFIX)) {
        const name = imageUrl.slice(PENDING_PREFIX.length)
        return name && !name.includes("..") ? { kind: "bucket", bucket: PENDING_BUCKET, path: name } : null
    }

    if (/^https?:\/\//.test(imageUrl)) {
        if (!supabaseUrl) return null
        let url: URL, base: URL
        try {
            url = new URL(imageUrl)
            base = new URL(supabaseUrl)
        } catch {
            return null
        }
        if (url.origin !== base.origin) return null
        // /storage/v1/object/{public|sign}/{bucket}/{path}
        const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/)
        if (!match) return null
        const [, bucket, objectPath] = match
        if (bucket !== PENDING_BUCKET && bucket !== VERIFIED_BUCKET) return null
        const decoded = decodeURIComponent(objectPath)
        return decoded.includes("..") ? null : { kind: "bucket", bucket, path: decoded }
    }

    // Legacy local uploads, confined to public/uploads
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads")
    const filePath = path.resolve(process.cwd(), "public", imageUrl.replace(/^\/+/, ""))
    return filePath.startsWith(uploadsDir + path.sep) ? { kind: "local", filePath } : null
}

export async function readImage(storage: CertificateStorage, source: ImageSource): Promise<Buffer> {
    return source.kind === "local" ? readFile(source.filePath) : storage.download(source.bucket, source.path)
}

/** Supabase-backed storage. Imported lazily so tests and non-storage paths never need the service key. */
export function supabaseStorage(): CertificateStorage {
    const admin = async () => (await import("@/lib/supabase")).supabaseAdmin
    return {
        async uploadPending(name, data, contentType) {
            const { error } = await (await admin()).storage.from(PENDING_BUCKET).upload(name, data, { contentType, upsert: false })
            if (error) throw new Error(`Gagal mengupload gambar ke penyimpanan aman: ${error.message}`)
        },
        async removePending(name) {
            await (await admin()).storage.from(PENDING_BUCKET).remove([name])
        },
        async signPendingUrl(name, expiresInSeconds) {
            const { data, error } = await (await admin()).storage.from(PENDING_BUCKET).createSignedUrl(name, expiresInSeconds)
            if (error) console.error("Failed to generate signed URL:", error)
            return data?.signedUrl ?? null
        },
        async uploadVerified(objectPath, data) {
            const client = await admin()
            const { error } = await client.storage.from(VERIFIED_BUCKET).upload(objectPath, data, { contentType: "image/png", upsert: true })
            if (error) throw new Error(`Gagal upload sertifikat terverifikasi: ${error.message}`)
            return client.storage.from(VERIFIED_BUCKET).getPublicUrl(objectPath).data.publicUrl
        },
        async download(bucket, objectPath) {
            const { data, error } = await (await admin()).storage.from(bucket).download(objectPath)
            if (error || !data) throw new Error(`Gagal mengunduh gambar: ${error?.message ?? "tidak ada data"}`)
            return Buffer.from(await data.arrayBuffer())
        },
    }
}
