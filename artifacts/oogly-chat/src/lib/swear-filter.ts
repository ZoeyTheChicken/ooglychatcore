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
  "shat", "niger", "white trailer trash", "goon"
];

// ---------------------------------------------------------------------------
// Normalization & pattern building
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
// Combo patterns
// ---------------------------------------------------------------------------

const COMBO_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "fuck+you",      regex: /f[u*@]c?k\s*(y[o0]u|u)/gi },
  { label: "kill+yourself", regex: /k[i!1]ll\s*(your|ur)?s[e3]lf/gi },
  { label: "go+die",        regex: /go\s+d[i1]e/gi },
  { label: "hate+slur",     regex: /i\s+(h[a4]te|h8)\s+(you|u|n[i!1]g|f[a4]g)/gi },
];

// ---------------------------------------------------------------------------
// AI school-safety check
// ---------------------------------------------------------------------------

const AI_ENDPOINT = "https://swearfilter.chickennet.work/api/chat";

export interface AiCheckResult {
  flagged: boolean;
  reason: string | null;
}

/**
 * The worker streams SSE chunks like:
 *   data: {"response":"Ye","p":"..."}
 *   data: {"response":"s","p":"..."}
 *   data: {"response":"","usage":{...}}
 *   data: [DONE]
 *
 * This reads the full body text, splits on newlines, parses each
 * `data: {...}` line, and concatenates every `response` field to
 * reconstruct the complete model reply before we check yes/no.
 */
async function readSseReply(response: Response): Promise<string> {
  const raw = await response.text();
  let fullReply = "";

  // Normalise CRLF and bare CR before splitting so JSON.parse never sees \r
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") break;
    try {
      const chunk = JSON.parse(payload);
      if (typeof chunk?.response === "string") {
        fullReply += chunk.response;
      }
    } catch {
      // malformed chunk - skip
    }
  }

  const result = fullReply.trim().toLowerCase();
  console.debug("[filter] SSE assembled reply:", JSON.stringify(result));
  return result;
}

/**
 * Sends the message to your Cloudflare Workers AI model and asks whether
 * it is inappropriate for a school setting.
 * Returns { flagged: false } on any network / parse error so the app stays up.
 *
 * @param text     The raw message text
 * @param context  Optional extra context (e.g. recent chat history summary)
 */
export async function aiCheck(
  text: string,
  context?: string,
): Promise<AiCheckResult> {
  const contextClause = context
    ? `[Context: ${context}] `
    : "[Context: school chat app for students aged 10-18] ";

  const prompt =
    `${contextClause}Hello, is this message '${text}' inappropriate for a school setting ` +
    `or just a weird/bad thing to say near a teacher or something? ` +
    `If it is, simply respond with EXCLUSIVELY "Yes" and NOTHING ELSE AT ALL, ` +
    `otherwise respond with "No" AND NOTHING ELSE AT ALL. Please say 'No' for mild language such as 'crap' 'sucks' or 'hell' though as I think that is alright to say.`;

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
      console.error("[filter] AI check HTTP error:", response.status);
      return { flagged: false, reason: null };
    }

    const reply = await readSseReply(response);
    console.debug("[filter] AI full reply:", JSON.stringify(reply));

    const flagged = reply.startsWith("yes");
    return { flagged, reason: flagged ? "ai-flagged" : null };
  } catch (err) {
    console.error("[filter] AI check failed, falling back to regex-only:", err);
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
 * Full two-pass filter. Awaitable — runs regex synchronously, then AI async.
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
  // Short-circuit: if regex already caught something, skip the AI call entirely
  // to save latency. Remove this early return if you want AI to always run.
  if (matches.length > 0) {
    return { flagged: true, matches: [...new Set(matches)], cleaned, aiFlag: false, aiReason: null };
  }

  const ai = await aiCheck(text, context);

  // Use ai.flagged alone — don't gate on ai.reason or a null reason silently passes bad messages
  if (ai.flagged) {
    matches.push(`ai:${ai.reason ?? "school-inappropriate"}`);
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
