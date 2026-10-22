import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { signSession, verifySession } from "../src/lib/session"
import { getEncryptionKey, getLegacyDecryptionKeys } from "../src/lib/crypto-key"
import { clearLoginFailures, loginRetryAfter, recordLoginFailure } from "../src/lib/rate-limit"

const user = { id: "u1", name: "A", email: "a@x.id", role: "USER" as const }
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")

describe("session tokens", () => {
    beforeEach(() => { process.env.SESSION_SECRET = "s".repeat(40) })

    it("round-trips a signed session", async () => {
        assert.deepEqual(await verifySession(await signSession(user)), { ...user, image: null })
    })

    it("rejects the old unsigned JSON cookie", async () => {
        assert.equal(await verifySession(JSON.stringify({ ...user, role: "ADMIN" })), null)
    })

    it("rejects a token whose payload was edited", async () => {
        const [header, , signature] = (await signSession(user)).split(".")
        assert.equal(await verifySession(`${header}.${b64({ ...user, role: "ADMIN" })}.${signature}`), null)
    })

    it("rejects alg=none", async () => {
        assert.equal(await verifySession(`${b64({ alg: "none" })}.${b64({ ...user, role: "ADMIN" })}.`), null)
    })

    it("rejects a token signed with another secret", async () => {
        const token = await signSession(user)
        process.env.SESSION_SECRET = "t".repeat(40)
        assert.equal(await verifySession(token), null)
    })

    it("refuses to sign without a strong secret", async () => {
        process.env.SESSION_SECRET = "short"
        await assert.rejects(() => signSession(user), /SESSION_SECRET/)
    })
})

describe("encryption key", () => {
    it("requires a 64-hex STEGANOGRAPHY_KEY", () => {
        process.env.STEGANOGRAPHY_KEY = randomBytes(32).toString("hex")
        assert.equal(getEncryptionKey().length, 32)
        process.env.STEGANOGRAPHY_KEY = "abc"
        assert.throws(() => getEncryptionKey(), /64 karakter hex/)
        delete process.env.STEGANOGRAPHY_KEY
        delete process.env.ENCRYPTION_KEY
        assert.throws(() => getEncryptionKey(), /64 karakter hex/)
    })

    it("only offers the legacy public key when explicitly enabled", () => {
        delete process.env.ALLOW_LEGACY_STEGO_KEY
        assert.equal(getLegacyDecryptionKeys().length, 0)
        process.env.ALLOW_LEGACY_STEGO_KEY = "true"
        assert.equal(getLegacyDecryptionKeys().length, 1)
        delete process.env.ALLOW_LEGACY_STEGO_KEY
    })
})

describe("login rate limit", () => {
    it("locks after 5 failures and unlocks on success", () => {
        const key = `k-${Math.random()}`
        for (let i = 0; i < 4; i++) recordLoginFailure(key)
        assert.equal(loginRetryAfter(key), 0)
        recordLoginFailure(key)
        assert.ok(loginRetryAfter(key) > 0)
        clearLoginFailures(key)
        assert.equal(loginRetryAfter(key), 0)
    })
})
