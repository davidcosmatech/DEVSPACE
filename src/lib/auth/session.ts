import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { dataRoot } from "@/lib/db/paths";

export const SESSION_COOKIE = "devspace_session";
const SESSION_DAYS = 7;

let secretPromise: Promise<Uint8Array> | undefined;

async function getSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }

  if (!secretPromise) {
    secretPromise = (async () => {
      const root = dataRoot();
      const file = path.join(root, ".session-secret");
      await mkdir(root, { recursive: true });
      try {
        const stored = (await readFile(file, "utf8")).trim();
        if (stored.length >= 32) return new TextEncoder().encode(stored);
      } catch {
        // Generate below.
      }
      const generated = randomBytes(48).toString("base64url");
      await writeFile(file, generated, { encoding: "utf8", mode: 0o600 });
      return new TextEncoder().encode(generated);
    })();
  }

  return secretPromise;
}

export async function createSessionToken(userId: string, sessionVersion = 0) {
  return new SignJWT({ scope: "devspace", ver: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience("devspace")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await getSecret());
}

export async function readSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, await getSecret(), {
      audience: "devspace",
    });
    if (typeof payload.sub !== "string") return null;
    return {
      userId: payload.sub,
      version: typeof payload.ver === "number" ? payload.ver : 0,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, sessionVersion = 0) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(userId, sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
