import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import type { Role } from "./rbac";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pw, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function authenticateOsUser(email: string, password: string): Promise<{ email: string; role: Role } | null> {
  const u = await prisma.osUser.findUnique({ where: { email: email.toLowerCase() } });
  // Always burn a hash so unknown users and wrong passwords take comparable time.
  const ok = await verifyPassword(password, u?.passwordHash ?? "00:00");
  return u && u.active && ok ? { email: u.email, role: u.role as Role } : null;
}
