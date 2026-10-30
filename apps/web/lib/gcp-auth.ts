import { createSign } from "node:crypto";

/**
 * Google Cloud access token from the service-account key in GCP_SERVICE_ACCOUNT_KEY.
 * Server-only. No SDK needed: we sign a short-lived JWT and swap it for a 1-hour token.
 *
 * The key never leaves the server and is never logged.
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cached: { token: string; expiresAt: number } | null = null;

/** Normalise common copy-paste damage: stray quotes, base64, double-escaped newlines. */
function rawKey(): { raw: string | null; format: "missing" | "json" | "base64" | "quoted-json" } {
  let raw = process.env.GCP_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return { raw: null, format: "missing" };
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"{') && raw.endsWith('}"'))) {
    return { raw: raw.slice(1, -1), format: "quoted-json" };
  }
  if (raw.startsWith("{")) return { raw, format: "json" };
  return { raw: Buffer.from(raw, "base64").toString("utf8"), format: "base64" };
}

function readKey(): ServiceAccountKey | null {
  const { raw } = rawKey();
  if (!raw) return null;
  try {
    const key = JSON.parse(raw) as ServiceAccountKey;
    if (!key.client_email || !key.private_key) return null;
    // Some dashboards double-escape newlines; PEM needs real ones.
    key.private_key = key.private_key.replace(/\\n/g, "\n");
    return key;
  } catch {
    console.error("GCP_SERVICE_ACCOUNT_KEY is not valid JSON");
    return null;
  }
}

/** Safe-to-show diagnostics. Never returns any part of the private key. */
export function gcpDiagnostics() {
  const { raw, format } = rawKey();
  let parses = false;
  let hasEmail = false;
  let hasPrivateKey = false;
  let serviceAccountDomain: string | null = null;
  if (raw) {
    try {
      const k = JSON.parse(raw) as Partial<ServiceAccountKey>;
      parses = true;
      hasEmail = Boolean(k.client_email);
      hasPrivateKey = Boolean(k.private_key?.includes("BEGIN PRIVATE KEY"));
      serviceAccountDomain = k.client_email?.split("@")[1] ?? null;
    } catch {
      /* parses stays false */
    }
  }
  return {
    projectSet: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
    project: process.env.GOOGLE_CLOUD_PROJECT ?? null,
    location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west2 (default)",
    keySet: raw !== null,
    keyLength: process.env.GCP_SERVICE_ACCOUNT_KEY?.length ?? 0,
    keyFormat: format,
    keyParsesAsJson: parses,
    keyHasClientEmail: hasEmail,
    keyHasPrivateKey: hasPrivateKey,
    serviceAccountDomain,
  };
}

export function gcpConfigured(): boolean {
  return Boolean(readKey() && process.env.GOOGLE_CLOUD_PROJECT);
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== "undefined") throw new Error("getAccessToken() is server-only.");
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const key = readKey();
  if (!key) return null;

  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("Google token exchange failed:", res.status);
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}
