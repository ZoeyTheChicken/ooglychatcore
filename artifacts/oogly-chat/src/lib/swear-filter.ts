/**
 * Oogly Chat — layered moderation (client)
 *
 *   1. Advanced local pass (normalization, collapsed-text, combos) — instant
 *   2. Cloud AI pass (swearfilter.chickennet.work) — runs in parallel
 *
 * Both layers contribute to the final result; AI is not skipped when local matches.
 */

import { runLocalFilter, checkUsernameFilter as localUsernameFilter } from "./moderation/local-filter";

export { previewLocalFilter } from "./moderation/local-filter";
export type { LocalFilterResult } from "./moderation/local-filter";

const AI_ENDPOINT = "https://swearfilter.chickennet.work/api/chat";

export interface AiCheckResult {
  flagged: boolean;
  reason: string | null;
}

async function readSseReply(response: Response): Promise<string> {
  const raw = await response.text();
  let fullReply = "";
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
      // skip malformed chunk
    }
  }

  return fullReply.trim().toLowerCase();
}

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
    const flagged = reply.startsWith("yes");
    return { flagged, reason: flagged ? "ai-flagged" : null };
  } catch (err) {
    console.error("[filter] AI check failed, local-only for this message:", err);
    return { flagged: false, reason: null };
  }
}

export interface FilterResult {
  flagged: boolean;
  matches: string[];
  cleaned: string;
  aiFlag: boolean;
  aiReason: string | null;
  localFlag: boolean;
  localLayers: string[];
}

/**
 * Full filter: local + AI in parallel. Flagged if either layer flags.
 */
export async function checkFilter(text: string, context?: string): Promise<FilterResult> {
  const [local, ai] = await Promise.all([
    Promise.resolve(runLocalFilter(text)),
    aiCheck(text, context),
  ]);

  const matches = [...local.matches];
  if (ai.flagged) {
    matches.push(`ai:${ai.reason ?? "school-inappropriate"}`);
  }

  return {
    flagged: local.flagged || ai.flagged,
    matches: [...new Set(matches)],
    cleaned: local.cleaned,
    aiFlag: ai.flagged,
    aiReason: ai.reason,
    localFlag: local.flagged,
    localLayers: local.layers,
  };
}

export function checkUsernameFilter(username: string): boolean {
  return localUsernameFilter(username);
}
