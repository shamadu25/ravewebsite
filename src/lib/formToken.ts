"use client";

/**
 * Browser helper for the signed time-trap token (see src/lib/antispam/formToken.ts).
 * `takeFormToken()` hands out the current token and immediately fetches a fresh one in the background,
 * so a retry after a failed submit never uses a token that is too young or already spent.
 */
let current: Promise<string | null> | null = null;

function fetchToken(): Promise<string | null> {
  return fetch("/api/forms/token", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.token === "string" ? (j.token as string) : null))
    .catch(() => null);
}

/** Call when a form mounts so the token is already "aged" by the time the visitor submits. */
export function prefetchFormToken(): void {
  if (!current) current = fetchToken();
}

export async function takeFormToken(): Promise<string | null> {
  if (!current) current = fetchToken();
  const token = await current;
  current = fetchToken(); // next one, ready for a retry or the next form
  return token;
}
