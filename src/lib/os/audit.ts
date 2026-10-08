import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { ORG_ID, type ActorType } from "./constants";

export interface AuditInput {
  actor: string;
  actorType: ActorType;
  action: string;
  resource: string;
  resourceId?: string | number | null;
  input?: unknown;
  output?: unknown;
  ip?: string | null;
  approvalId?: number | null;
  result?: "SUCCESS" | "FAILURE" | "DENIED";
}

const SECRET_KEYS = /(password|secret|token|api[_-]?key|authorization|credential)/i;

/** Strip anything that looks like a credential before it reaches the audit trail. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1),
      ])
    );
  }
  if (typeof value === "string" && value.length > 4000) return value.slice(0, 4000) + "…[truncated]";
  return value;
}

export interface HashableEntry {
  actor: string;
  actorType: string;
  action: string;
  resource: string;
  resourceId: string | null;
  input: unknown;
  output: unknown;
  result: string;
  prevHash: string;
  createdAt: Date;
}

/** Key-sorted JSON. MySQL's JSON column re-orders object keys, so hashing must not depend on key order. */
export function canonicalJson(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeAuditHash(e: HashableEntry): string {
  return createHash("sha256")
    .update(
      canonicalJson([
        e.prevHash,
        e.actor,
        e.actorType,
        e.action,
        e.resource,
        e.resourceId,
        e.input ?? null,
        e.output ?? null,
        e.result,
        e.createdAt.toISOString(),
      ])
    )
    .digest("hex");
}

/** Walk a chronologically ordered chain; returns the id of the first broken link, or null if intact. */
export function findChainBreak(entries: Array<HashableEntry & { id: number; hash: string }>): number | null {
  let prev = "GENESIS";
  for (const e of entries) {
    if (e.prevHash !== prev || computeAuditHash(e) !== e.hash) return e.id;
    prev = e.hash;
  }
  return null;
}

/**
 * Append-only audit write. Each row hashes its predecessor, so editing or deleting a
 * historical row is detectable via verifyAuditChain(). There is deliberately no update/delete API.
 */
export async function audit(entry: AuditInput): Promise<void> {
  try {
    const last = await prisma.osAuditLog.findFirst({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, select: { hash: true } });
    const createdAt = new Date();
    const base: HashableEntry = {
      actor: entry.actor,
      actorType: entry.actorType,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId == null ? null : String(entry.resourceId),
      input: redact(entry.input),
      output: redact(entry.output),
      result: entry.result ?? "SUCCESS",
      prevHash: last?.hash ?? "GENESIS",
      createdAt,
    };
    await prisma.osAuditLog.create({
      data: {
        orgId: ORG_ID,
        actor: base.actor,
        actorType: base.actorType,
        action: base.action,
        resource: base.resource,
        resourceId: base.resourceId,
        input: (base.input ?? undefined) as never,
        output: (base.output ?? undefined) as never,
        ip: entry.ip ?? null,
        approvalId: entry.approvalId ?? null,
        result: base.result,
        prevHash: base.prevHash,
        hash: computeAuditHash(base),
        createdAt,
      },
    });
  } catch (error) {
    // An audit failure must be loud, never silent.
    console.error("[os.audit] FAILED TO WRITE AUDIT EVENT", entry.action, error);
  }
}

export async function verifyAuditChain(): Promise<{ intact: boolean; checked: number; brokenAtId: number | null }> {
  const rows = await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "asc" } });
  const brokenAtId = findChainBreak(
    rows.map((r) => ({
      id: r.id,
      hash: r.hash,
      prevHash: r.prevHash,
      actor: r.actor,
      actorType: r.actorType,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      input: r.input,
      output: r.output,
      result: r.result,
      createdAt: r.createdAt,
    }))
  );
  return { intact: brokenAtId === null, checked: rows.length, brokenAtId };
}
