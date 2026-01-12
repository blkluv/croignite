import "server-only";

import { cookies } from "next/headers";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env/server";

const COOKIE_NAME = "croignite_openai_key";
const ALGO = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function deriveSecretKey(): Buffer | null {
  const raw = getServerEnv("OPENAI_BYOK_COOKIE_SECRET")?.trim();
  if (!raw) return null;

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }

  if (raw.length < 32) {
    throw new Error(
      "OPENAI_BYOK_COOKIE_SECRET must be set to a long random value (>= 32 chars) or base64 for 32 bytes.",
    );
  }

  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveSecretKey();
  if (!key) {
    throw new Error("OPENAI_BYOK_COOKIE_SECRET is required to store an OpenAI key.");
  }

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
}

function decrypt(payload: string): string | null {
  try {
    const key = deriveSecretKey();
    if (!key) return null;

    const [ivB64, tagB64, cipherB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !cipherB64) return null;

    const iv = fromBase64Url(ivB64);
    const tag = fromBase64Url(tagB64);
    const ciphertext = fromBase64Url(cipherB64);

    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

export function setOpenAIKeyCookie(response: NextResponse, apiKey: string) {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("API key is required.");
  }

  const value = encrypt(key);

  response.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearOpenAIKeyCookie(response: NextResponse) {
  response.cookies.delete(COOKIE_NAME);
}

export async function getOpenAIKeyCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const decrypted = decrypt(raw);
  if (!decrypted) return null;

  const trimmed = decrypted.trim();
  if (!trimmed) return null;

  return trimmed;
}

export async function hasOpenAIKeyCookie(): Promise<boolean> {
  return (await getOpenAIKeyCookie()) !== null;
}
