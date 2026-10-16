import { createHash } from "crypto";
import { OFFER } from "./config";

export interface PolicyDraft {
  subject: string;
  body: string;
  toEmail: string;
  senderIdentity: string;
  postalAddress: string;
  touch: number;
}
export interface PolicyIssue { code: string; message: string }
export interface PolicyResult { passed: boolean; issues: PolicyIssue[]; checkedAt: string }

const HYPE = /\b(guarantee[sd]?|10x|revolutionary|game[- ]chang|100%|risk[- ]free|act now|last chance|limited time|urgent)\b/i;
const FAKE_PROOF = /\b(case stud(y|ies)|our clients (include|saw)|your competitors (use|are using)|we helped \d+)\b/i;
const FAKE_FAMILIAR = /\b(as we discussed|following our (call|conversation)|great speaking|our last (chat|call))\b/i;
const FALSE_RE = /^\s*(re|fwd?):/i;
const UNCONFIRMED_CLAIMS = /\b(you (miss|lose|are losing) (calls|customers|leads)|your (team|business) (misses|loses))\b/i;

/** Deterministic content gate run on every draft version and again at dispatch time. */
export function checkPolicy(d: PolicyDraft): PolicyResult {
  const issues: PolicyIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const text = `${d.subject}\n${d.body}`;
  if (!d.subject.trim() || d.subject.length > 90) add("subject", "Subject missing or too long.");
  if (d.touch === 1 && FALSE_RE.test(d.subject)) add("deceptive_subject", "First-touch subject must not fake a reply thread.");
  if (HYPE.test(text)) add("hype", "Contains guarantee/hype/urgency language.");
  if (FAKE_PROOF.test(text)) add("fake_proof", "Contains unverified case-study or competitor claims.");
  if (FAKE_FAMILIAR.test(text)) add("fake_familiarity", "Implies a prior conversation.");
  if (UNCONFIRMED_CLAIMS.test(text)) add("unsupported_claim", "States a business problem as fact; phrase it as a question or cite evidence.");
  if (!/unsubscribe|opt[- ]?out|stop (hearing|receiving)|no longer wish/i.test(d.body)) add("opt_out", "Opt-out instruction missing.");
  if (!d.senderIdentity.trim()) add("sender", "Sender identity missing.");
  if (!d.postalAddress.trim()) add("postal_address", "Sender postal address missing (required for US commercial email). Set GROWTH_POSTAL_ADDRESS.");
  if (!d.body.includes(d.senderIdentity)) add("sender_in_body", "Sender identity not shown in the body.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.toEmail)) add("recipient", "Invalid recipient address.");
  if (d.body.split(/\s+/).length > 180) add("length", "Body too long for a first message.");
  void OFFER;
  return { passed: issues.length === 0, issues, checkedAt: new Date().toISOString() };
}

/** Hash binds an approval to the exact recipient, sender, subject and body. */
export function contentHash(d: Pick<PolicyDraft, "toEmail" | "senderIdentity" | "subject" | "body">): string {
  return createHash("sha256").update(JSON.stringify([d.toEmail.toLowerCase(), d.senderIdentity, d.subject, d.body])).digest("hex");
}
