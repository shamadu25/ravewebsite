/**
 * Cheap content heuristics for free-text form fields. Tuned to catch obvious spam (link farms, SEO/pharma/
 * casino pitches, random-string names, disposable mailboxes) while letting genuine enquiries through:
 * a single weak signal never blocks; only a combined score of REJECT_SCORE or more does.
 */
export const REJECT_SCORE = 3;

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|info|biz|xyz|top|ru|cn|click|link|site|online|shop)\b\/?\S*/gi;

/** Almost never appear in a genuine software enquiry. */
const STRONG = [
  /\bviagra\b|\bcialis\b|\bcasino\b|\bporn\b|\bescort\b|\bbuy followers\b|\bpayday loan\b|\bsex\b/i,
  /\bbacklinks?\b|\bguest post\b|\bseo (services?|expert|package|audit|agency|specialist)\b|\bfirst page of google\b|\brank (your )?(site|website)\b/i,
  /\bmake money (fast|online)\b|\bearn \$?\d+ ?(per|a|\/) ?(day|hour|week)\b|\bwork from home\b|\bclick here\b|\bcongratulations,? you\b|\blottery\b|\bwinner\b/i,
];
/** Can be legitimate on their own (e.g. a real fintech brief) so they only add a little. */
const WEAK = [/\bcrypto(currency)?\b|\bbitcoin\b|\bforex\b|\bnft\b/i, /\btelegram\b|\bwhatsapp me\b|\bdm me\b/i, /\bloan offer\b|\binvestment opportunity\b|\bguaranteed\b/i];

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "trashmail.com", "throwawaymail.com", "sharklasers.com", "getnada.com", "dispostable.com",
  "maildrop.cc", "fakeinbox.com", "mintemail.com", "mohmal.com", "tempail.com", "emailondeck.com",
]);

export interface ContentInput {
  name?: string;
  company?: string;
  email?: string;
  message?: string;
}
export interface ContentVerdict {
  spam: boolean;
  score: number;
  reasons: string[];
}

const urlCount = (s: string) => (s.match(URL_RE) ?? []).length;

function looksRandom(s: string): boolean {
  const t = s.replace(/[^A-Za-z]/g, "");
  if (t.length >= 8 && !/[aeiouAEIOU]/.test(t)) return true; // no vowels at all
  // camel-case noise like "aKjHgFdSaQ": many case flips inside one token
  const flips = (t.match(/[a-z][A-Z]/g) ?? []).length;
  return t.length >= 8 && flips >= 3 && !/\s/.test(s);
}

export function analyzeContent(input: ContentInput): ContentVerdict {
  const reasons: string[] = [];
  let score = 0;
  const add = (n: number, why: string) => {
    score += n;
    reasons.push(why);
  };

  const { name = "", company = "", email = "", message = "" } = input;
  const all = `${name} ${company} ${message}`;

  if (urlCount(name) + urlCount(company) > 0) add(3, "link_in_name_or_company");
  const links = urlCount(message);
  if (links >= 3) add(3, "many_links");
  else if (links === 2) add(1, "two_links");

  const strong = STRONG.filter((re) => re.test(all)).length;
  if (strong >= 1) add(3, "spam_phrase");
  const weak = WEAK.filter((re) => re.test(all)).length;
  if (weak >= 2) add(2, "spam_terms");
  else if (weak === 1) add(1, "spam_term");

  if (name && looksRandom(name)) add(2, "random_name");
  if (/(.)\1{9,}/.test(all)) add(1, "repeated_characters");
  if (new RegExp("[\\u200B-\\u200F\\u2028-\\u202E\\u2060\\uFEFF]").test(all)) add(2, "hidden_characters");
  if (new RegExp("[\\u0400-\\u04FF\\u4E00-\\u9FFF\\u0600-\\u06FF]{6,}").test(message)) add(1, "unexpected_script");

  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE.has(domain)) add(3, "disposable_email");

  return { spam: score >= REJECT_SCORE, score, reasons };
}
