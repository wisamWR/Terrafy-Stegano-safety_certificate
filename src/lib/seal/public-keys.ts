// Public half of the Terrafy seal keys. Safe to commit and to ship to the browser.
// Generate a pair with `npm run seal:keygen`; the private seed goes to SEAL_SIGNING_KEY in .env.
// Rotation: add a new kid, point activeKid at it, keep old kids so old seals still verify.
// Compromise: move the kid into revokedKids.

export type Keyring = {
    activeKid: string
    publicKeys: Readonly<Record<string, string>> // kid -> 32-byte Ed25519 public key, hex
    revokedKids: readonly string[]
}

export const DEFAULT_KEYRING: Keyring = {
    activeKid: "terrafy-2026-1",
    publicKeys: {
        "terrafy-2026-1": "fbcd3e8077c005bf3219e227cd95300a8701d79eb60452fbf0704d65781a88ff",
    },
    revokedKids: [],
}
