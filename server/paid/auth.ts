/**
 * Wallet login via Dynamic.xyz. The browser signs in with Dynamic (Solana
 * wallet) and sends its JWT; the server verifies it against Dynamic's JWKS
 * and reads the verified Solana address. No private keys ever touch the server.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

export type WalletVerifier = (token: string) => Promise<string>;

export function dynamicWalletVerifier(environmentId: string): WalletVerifier {
  const jwks = createRemoteJWKSet(new URL(`https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`));
  return async (token: string) => {
    const { payload } = await jwtVerify(token, jwks);
    const creds = (payload.verified_credentials ?? []) as { address?: string; chain?: string; format?: string }[];
    const sol = creds.find((c) => c.format === "blockchain" && (c.chain ?? "").toLowerCase() === "solana" && c.address);
    if (!sol?.address) throw new Error("No verified Solana wallet on this login");
    return sol.address;
  };
}
