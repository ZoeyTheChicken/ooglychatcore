/**
 * Oogly Chat — Regex-powered swear filter
 * Blocks exact words, leetspeak variants, combinations, and repeated chars.
 */

// Core banned words and phrases (add more as needed)
const RAW_BANNED = [
  // Slurs & severe profanity
  "fuck", "f.uck", "fuk", "fucc", "fvck", "phuck",
  "shit", "sh1t", "sh!t", "sheit",
  "ass", "a55", "@ss",
  "asshole", "a55hole",
  "bastard", "b4stard",
  "bitch", "b1tch", "bi+ch", "bytch",
  "cunt", "c.unt", "kunt",
  "dick", "d1ck", "dik", "dih", "bih",
  "cock", "c0ck",
  "pussy", "puss1",
  "whore", "wh0re",
  "slut", "sl.ut",
  "nigger", "n1gger", "n!gger", "n.igger",
  "nigga", "n1gga",
  "faggot", "f4ggot", "fag",
  "retard", "ret4rd",
  "rape", "r@pe",
  "pedophile", "pedo",
  "nazi", "n@2i",
  "clanker", "clank", "clanka",
  "niggers", "niggas",
  "vagina", "vag!na", "sperm", "penis", "cum", "cumrag",
  "fagg",
  "faggots",
  "faggg",
  "f@g",
  "f@ggot",
];

// Normalize a string: lowercase, remove zero-width chars, common leetspeak
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // zero-width & soft hyphens
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/\+/g, "t")
    .replace(/[\/\\]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1"); // collapse 3+ repeated chars to 2
}

// Build a regex that matches a word even with inserted non-alpha chars between letters
function buildWordPattern(word: string): RegExp {
  // Escape dots and specials in the raw word
  const escaped = normalize(word)
    .split("")
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^a-z0-9]?"); // allow a single non-alphanumeric between each letter
  // Word boundary OR surrounded by non-alpha to catch mid-word embedding
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi");
}

// Pre-compile all patterns
const BANNED_PATTERNS: Array<{ word: string; regex: RegExp }> = RAW_BANNED.map(
  (word) => ({
    word,
    regex: buildWordPattern(word),
  }),
);

// Combo detection: pairs that are especially bad together
const COMBO_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: "fuck+you",
    regex: /f[u*@]c?k\s*(y[o0]u|u)/gi,
  },
  {
    label: "kill+yourself",
    regex: /k[i!1]ll\s*(your|ur)?s[e3]lf/gi,
  },
  {
    label: "go+die",
    regex: /go\s+d[i1]e/gi,
  },
  {
    label: "hate+slur",
    regex: /i\s+(h[a4]te|h8)\s+(you|u|n[i!1]g|f[a4]g)/gi,
  },
];

export interface FilterResult {
  flagged: boolean;
  matches: string[];
  cleaned: string;
}

export function checkFilter(text: string): FilterResult {
  const normalized = normalize(text);
  const matches: string[] = [];
  let cleaned = text;

  // Check combos first
  for (const combo of COMBO_PATTERNS) {
    if (combo.regex.test(normalized)) {
      matches.push(`combo:${combo.label}`);
    }
    combo.regex.lastIndex = 0;
  }

  // Check individual words
  for (const { word, regex } of BANNED_PATTERNS) {
    if (regex.test(normalized)) {
      matches.push(word);
      // Replace in cleaned text (non-destructive to original casing)
      cleaned = cleaned.replace(regex, (m) => "*".repeat(m.length));
    }
    regex.lastIndex = 0;
  }

  return {
    flagged: matches.length > 0,
    matches: [...new Set(matches)],
    cleaned,
  };
}

/**
 * Check a username against the filter (stricter — no spaces/combos, just words)
 */
export function checkUsernameFilter(username: string): boolean {
  const normalized = normalize(username);
  for (const { regex } of BANNED_PATTERNS) {
    if (regex.test(normalized)) {
      regex.lastIndex = 0;
      return true; // flagged
    }
    regex.lastIndex = 0;
  }
  return false;
}
