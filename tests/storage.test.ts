import { describe, it } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { resolveImageSource } from "../src/lib/certificates/storage"

const SUPA = "https://abc.supabase.co"

describe("resolveImageSource", () => {
    it("maps pending bucket paths", () => {
        assert.deepEqual(resolveImageSource("pending-uploads/pending_1_a.png", SUPA), { kind: "bucket", bucket: "pending-uploads", path: "pending_1_a.png" })
    })

    it("maps our public and signed storage URLs", () => {
        assert.deepEqual(
            resolveImageSource(`${SUPA}/storage/v1/object/public/certificates/verified/v_1.png`, SUPA),
            { kind: "bucket", bucket: "certificates", path: "verified/v_1.png" },
        )
        assert.deepEqual(
            resolveImageSource(`${SUPA}/storage/v1/object/sign/pending-uploads/p%20q.png?token=abc`, SUPA),
            { kind: "bucket", bucket: "pending-uploads", path: "p q.png" },
        )
    })

    it("refuses other hosts (SSRF)", () => {
        assert.equal(resolveImageSource("http://169.254.169.254/latest/meta-data", SUPA), null)
        assert.equal(resolveImageSource("https://abc.supabase.co.evil.com/storage/v1/object/public/certificates/x.png", SUPA), null)
        assert.equal(resolveImageSource(`${SUPA}/rest/v1/users`, SUPA), null)
    })

    it("refuses buckets other than ours", () => {
        assert.equal(resolveImageSource(`${SUPA}/storage/v1/object/public/avatars/x.png`, SUPA), null)
    })

    it("refuses path traversal", () => {
        assert.equal(resolveImageSource("pending-uploads/../secret", SUPA), null)
        assert.equal(resolveImageSource("../../.env", SUPA), null)
        assert.equal(resolveImageSource("/uploads/../../.env", SUPA), null)
        assert.equal(resolveImageSource(`${SUPA}/storage/v1/object/public/certificates/%2E%2E/x`, SUPA), null)
    })

    it("allows legacy files inside public/uploads only", () => {
        const res = resolveImageSource("/uploads/cert_1.png", SUPA)
        assert.deepEqual(res, { kind: "local", filePath: path.resolve(process.cwd(), "public", "uploads", "cert_1.png") })
        assert.equal(resolveImageSource("/favicon.ico", SUPA), null)
    })
})
