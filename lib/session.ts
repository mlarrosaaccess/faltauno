import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "faltauno_session";

function secret() {
  const value =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dev-only-faltauno-secret-32chars");
  if (!value || value.length < 16) {
    throw new Error("Configurá AUTH_SECRET en las variables de entorno");
  }
  return new TextEncoder().encode(value);
}

export async function setSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function readSessionUserId() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}
