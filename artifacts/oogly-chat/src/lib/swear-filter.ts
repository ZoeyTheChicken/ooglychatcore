/**
 * Oogly Chat — Regex-powered swear filter + AI school-safety check
 *
 * Two-pass system:
 *   1. Fast regex pass (instant, catches known slurs/profanity)
 *   2. AI pass via swearfilter.chickennet.work (catches threats, bullying, drug refs, etc.)
 *
 * Usage:
 *   import { checkFilter, checkUsernameFilter } from "./filter";
 *   const result = await checkFilter("your message here");
 *
 * If the AI request fails for any reason, the filter falls back to
 * regex-only results so your app stays online.
 */

// ---------------------------------------------------------------------------
// Core banned words and phrases (add more as needed)
// ---------------------------------------------------------------------------
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
  "gay", "g@y", "gayy", "lesbian",
  "ligger", "ligga",
];

// ---------------------------------------------------------------------------
// Normalization & pattern building (unchanged from original)
// ---------------------------------------------------------------------------

/** Lowercase, strip zero-width chars, map common leetspeak, collapse repeated chars */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/\+/g, "t")
    .replace(/[\/\\]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1");
}

function buildWordPattern(word: string): RegExp {
  const escaped = normalize(word)
    .split("")
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^a-z0-9]?");
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi");
}

const BANNED_PATTERNS: Array<{ word: string; regex: RegExp }> = RAW_BANNED.map(
  (word) => ({ word, regex: buildWordPattern(word) }),
);

// ---------------------------------------------------------------------------
// Combo patterns (unchanged)
// ---------------------------------------------------------------------------

const COMBO_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "fuck+you",       regex: /f[u*@]c?k\s*(y[o0]u|u)/gi },
  { label: "kill+yourself",  regex: /k[i!1]ll\s*(your|ur)?s[e3]lf/gi },
  { label: "go+die",         regex: /go\s+d[i1]e/gi },
  { label: "hate+slur",      regex: /i\s+(h[a4]te|h8)\s+(you|u|n[i!1]g|f[a4]g)/gi },
];

// ---------------------------------------------------------------------------
// AI school-safety check
// ---------------------------------------------------------------------------

const AI_ENDPOINT = "https://swearfilter.chickennet.work/api/chat";

export interface AiCheckResult {
  flagged: boolean;
  /** Always null for this model since it only returns Yes/No */
  reason: string | null;
}

/**
 * Sends the message to your Cloudflare Workers AI model and asks whether
 * it is inappropriate for a school setting.
 * Returns { flagged: false } on any network / parse error so the app stays up.
 *
 * The model is prompted to respond ONLY with "Yes" (flag) or "No" (pass).
 *
 * @param text     The raw message text
 * @param context  Optional extra context (e.g. recent chat history summary)
 */
export async function aiCheck(
  text: string,
  context?: string,
): Promise<AiCheckResult> {
  // Build the context prefix so the model has useful background
  const contextClause = context
    ? `[Context: ${context}] `
    : "[Context: school chat app for middle school aged students] ";

  const prompt =
    `${contextClause}Hello, is this message '${text}' inappropriate for a school setting ` +
    `or just a weird/bad thing to say near a teacher or something? ` +
    `If it is, simply respond with EXCLUSIVELY "Yes" and NOTHING ELSE AT ALL, ` +
    `otherwise respond with "No" AND NOTHING ELSE AT ALL. You must also be able to detect if someone has replaced a certain letter in a swear with another to attempt to bypass you and send a message anyways, for example replacing 'n' in a specific hateful racist slur with an 'l' or other letters, and detect for any other swears too.`;

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return { flagged: false, reason: null };
    }

    const data = await response.json();

    // The API wraps the reply in data.response (Cloudflare Workers AI convention)
    // Fall back to scanning all string values if the shape differs.
    const reply: string =
      (typeof data?.response === "string" ? data.response :
       typeof data?.result?.response === "string" ? data.result.response :
       JSON.stringify(data))
      .trim()
      .toLowerCase();

    // Any reply starting with "yes" is a flag; anything else is a pass
    const flagged = reply.startsWith("yes");
    return { flagged, reason: flagged ? "ai-flagged" : null };
  } catch (err) {
    return { flagged: false, reason: null };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FilterResult {
  /** True if regex OR AI flagged the message */
  flagged: boolean;
  /** List of matched banned words / combo labels / AI reason */
  matches: string[];
  /** Message with banned words replaced by asterisks */
  cleaned: string;
  /** Whether the AI check was responsible for the flag */
  aiFlag: boolean;
  /** Human-readable AI reason if aiFlag is true, otherwise null */
  aiReason: string | null;
}

/**
 * Full two-pass filter.  Awaitable — runs regex synchronously, then AI async.
 *
 * @param text     Raw message text from the user
 * @param context  Optional context string forwarded to the AI (e.g. username, channel name)
 */
export async function checkFilter(text: string, context?: string): Promise<FilterResult> {
  const normalized = normalize(text);
  const matches: string[] = [];
  let cleaned = text;

  // --- Pass 1: regex combos ---
  for (const combo of COMBO_PATTERNS) {
    if (combo.regex.test(normalized)) {
      matches.push(`combo:${combo.label}`);
    }
    combo.regex.lastIndex = 0;
  }

  // --- Pass 1: regex individual words ---
  for (const { word, regex } of BANNED_PATTERNS) {
    if (regex.test(normalized)) {
      matches.push(word);
      cleaned = cleaned.replace(regex, (m) => "*".repeat(m.length));
    }
    regex.lastIndex = 0;
  }

  // --- Pass 2: AI school-safety check ---
  // We always run this, even if regex already flagged, to collect the AI reason.
  // You can short-circuit here with `if (matches.length === 0)` to save API
  // calls if regex already caught something.
  const ai = await aiCheck(text, context);

  if (ai.flagged && ai.reason) {
    matches.push(`ai:${ai.reason}`);
  }

  return {
    flagged: matches.length > 0,
    matches: [...new Set(matches)],
    cleaned,
    aiFlag: ai.flagged,
    aiReason: ai.reason,
  };
}

/**
 * Username filter — regex only (no AI needed, usernames are short & static).
 * Returns true if the username is flagged.
 */
export function checkUsernameFilter(username: string): boolean {
  const normalized = normalize(username);
  for (const { regex } of BANNED_PATTERNS) {
    if (regex.test(normalized)) {
      regex.lastIndex = 0;
      return true;
    }
    regex.lastIndex = 0;
  }
  return false;
}
