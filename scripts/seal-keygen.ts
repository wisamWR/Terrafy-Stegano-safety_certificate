// Usage: npm run seal:keygen -- <kid>
// Prints a fresh Ed25519 seed for .env and the public key line for src/lib/seal/public-keys.ts.
import { randomBytes } from "crypto"
import { publicKeyHexOf, signingKeyFromSeed } from "../src/lib/seal/sign"

const kid = process.argv[2] ?? `terrafy-${new Date().getFullYear()}-1`
const seed = randomBytes(32).toString("hex")
const publicKey = publicKeyHexOf(signingKeyFromSeed(seed))

console.log("# .env (secret, never commit):")
console.log(`SEAL_SIGNING_KEY=${seed}`)
console.log("")
console.log("# src/lib/seal/public-keys.ts -> publicKeys:")
console.log(`"${kid}": "${publicKey}",`)
