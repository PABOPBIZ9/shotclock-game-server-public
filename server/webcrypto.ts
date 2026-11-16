/**
 * jose v6 verifies JWTs with the WebCrypto global (`globalThis.crypto.subtle`). Node 18 (Railway/Nixpacks default)
 * has no `crypto` global, so every real sign-in token failed with "crypto is not defined" at Register.
 * Install Node's WebCrypto as the global before anything else loads.
 */
import { webcrypto } from "node:crypto";
const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto;
export {};
