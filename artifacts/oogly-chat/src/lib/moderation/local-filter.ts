import {
  collapseToAlphanumeric,
  moderationViews,
  normalizeForModeration,
} from "./text-normalize";

const RAW_BANNED = [
  "fuck", "f.uck", "fuk", "fucc", "fvck", "phuck", "fukk", "fuuk",
  "shit", "sh1t", "sh!t", "sheit", "shyt", "sht",
  "ass", "a55", "@ss", "arse",
  "asshole", "a55hole",
  "bastard", "b4stard",
  "bitch", "b1tch", "bi+ch", "bytch", "biatch",
  "cunt", "c.unt", "kunt",
  "dick", "d1ck", "dik", "dih", "bih", "dck",
  "cock", "c0ck", "cok",
  "pussy", "puss1", "pusy",
  "whore", "wh0re", "hoer",
  "slut", "sl.ut",
  "nigger", "n1gger", "n!gger", "n.igger", "niggur",
  "nigga", "n1gga", "niggas", "niggers",
  "faggot", "f4ggot", "fag", "fagg", "faggots", "faggg", "f@g", "f@ggot",
  "retard", "ret4rd", "tard",
  "rape", "r@pe", "rapist",
  "pedophile", "pedo", "paedo",
  "nazi", "n@2i", "nazis",
  "clanker", "clank", "clanka",
  "vagina", "vag!na", "sperm", "penis", "cum", "cumrag",
  "gayy", "lesbian",
  "shat", "niger", "white trailer trash", "goon",
  "motherfucker", "mf", "stfu", "gtfo",
  "kys", "kill yourself",
];

const COMBO_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "fuck+you", regex: /f[u*@]c?k\s*(y[o0]u|u)/gi },
  { label: "kill+yourself", regex: /k[i!1]ll\s*(your|ur)?s[e3]lf/gi },
  { label: "go+die", regex: /go\s+d[i1]e/gi },
  { label: "hate+slur", regex: /i\s+(h[a4]te|h8)\s+(you|u|n[i!1]g|f[a4]g)/gi },
  { label: "kys", regex: /\bk[\s._-]*y[\s._-]*s\b/gi },
  { label: "unalive", regex: /un[\s._-]*alive\s*(your|ur)?self/gi },
];

const EMBEDDED_PATTERNS: Array<{ label: string; test: (tight: string) => boolean }> = [
  { label: "embedded-slur", test: (t) => /n[i1!]gg[aer]/.test(t) },
  { label: "embedded-slur", test: (t) => /f[a4@]gg[o0]?t/.test(t) },
  { label: "embedded-profanity", test: (t) => /f[u*@]c?k/.test(t) && t.length <= 64 },
];

function buildWordPattern(word: string): RegExp {
  const normalized = normalizeForModeration(word);
  const escaped = normalized
    .split("")
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^a-z0-9]?");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "gi");
}

const BANNED_PATTERNS = RAW_BANNED.map((word) => ({
  word,
  regex: buildWordPattern(word),
  tight: normalizeForModeration(word).replace(/[^a-z0-9]/g, ""),
}));

export interface LocalFilterResult {
  flagged: boolean;
  matches: string[];
  cleaned: string;
  /** Which local layers fired (for debugging / UI) */
  layers: string[];
}

function uniquePush(arr: string[], value: string) {
  if (!arr.includes(value)) arr.push(value);
}

/**
 * Synchronous local moderation pass — regex, collapsed-text, combos, embedded patterns.
 */
export function runLocalFilter(text: string): LocalFilterResult {
  const views = moderationViews(text);
  const matches: string[] = [];
  const layers: string[] = [];
  let cleaned = text;

  for (const combo of COMBO_PATTERNS) {
    if (combo.regex.test(views.loose) || combo.regex.test(text)) {
      uniquePush(matches, `combo:${combo.label}`);
      layers.push("combo");
    }
    combo.regex.lastIndex = 0;
  }

  for (const { word, regex, tight } of BANNED_PATTERNS) {
    if (!tight || tight.length < 3) continue;

    const looseHit = regex.test(views.loose) || regex.test(views.spaced);
    const tightHit =
      views.tight.includes(tight) ||
      collapseToAlphanumeric(views.spaced).includes(tight);

    if (looseHit || tightHit) {
      uniquePush(matches, word);
      layers.push(looseHit ? "regex" : "collapsed");
      cleaned = cleaned.replace(regex, (m) => "*".repeat(m.length));
    }
    regex.lastIndex = 0;
  }

  for (const embedded of EMBEDDED_PATTERNS) {
    if (embedded.test(views.tight)) {
      uniquePush(matches, embedded.label);
      layers.push("embedded");
    }
  }

  return {
    flagged: matches.length > 0,
    matches,
    cleaned,
    layers: [...new Set(layers)],
  };
}

export function checkUsernameFilter(username: string): boolean {
  return runLocalFilter(username).flagged;
}

/** Instant hint for the compose box — no network */
export function previewLocalFilter(text: string): Pick<LocalFilterResult, "flagged" | "layers"> {
  const { flagged, layers } = runLocalFilter(text);
  return { flagged, layers };
}
