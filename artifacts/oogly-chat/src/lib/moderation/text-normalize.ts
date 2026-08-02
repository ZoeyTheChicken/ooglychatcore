/**
 * Multi-layer text normalization for evasion-resistant local moderation.
 * Used only on the client; complements (does not replace) server-side filtering.
 */

const HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c",
  "\u0443": "y", "\u0445": "x", "\u0456": "i", "\u0458": "j", "\u04bb": "h",
  "\u0251": "a", "\u03b1": "a", "\u03b5": "e", "\u03bf": "o", "\u1d00": "a",
  "\u1d04": "c", "\u1d05": "d", "\u1d07": "e", "\u1d0a": "j", "\u1d0b": "k",
  "\u1d0d": "m", "\u1d0f": "o", "\u1d18": "p", "\u1d1b": "t", "\u1d1c": "u",
  "\uff41": "a", "\uff42": "b", "\uff43": "c", "\uff44": "d", "\uff45": "e",
  "\uff46": "f", "\uff47": "g", "\uff48": "h", "\uff49": "i", "\uff4a": "j",
  "\uff4b": "k", "\uff4c": "l", "\uff4d": "m", "\uff4e": "n", "\uff4f": "o",
  "\uff50": "p", "\uff51": "q", "\uff52": "r", "\uff53": "s", "\uff54": "t",
  "\uff55": "u", "\uff56": "v", "\uff57": "w", "\uff58": "x", "\uff59": "y",
  "\uff5a": "z",
  "@": "a", "$": "s", "!": "i", "|": "i", "1": "i", "3": "e", "4": "a",
  "0": "o", "5": "s", "7": "t", "+": "t",
};

/** Strip accents, map homoglyphs/leetspeak, collapse repeats, remove zero-width junk */
export function normalizeForModeration(text: string): string {
  let s = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

  s = s.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, "");

  s = [...s].map((ch) => HOMOGLYPHS[ch] ?? ch).join("");

  s = s
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/\+/g, "t")
    .replace(/7/g, "t")
    .replace(/ph/g, "f");

  s = s.replace(/(.)\1{2,}/g, "$1$1");

  return s;
}

/** Letters/digits only — catches f.u.c.k, f-u-c-k, f u c k */
export function collapseToAlphanumeric(text: string): string {
  return normalizeForModeration(text).replace(/[^a-z0-9]/g, "");
}

/**
 * Rejoin single-character tokens separated by punctuation/spaces:
 * "f u c k" → tokens might become "fuck" when joined
 */
export function joinSpacedLetters(text: string): string {
  const parts = text.split(/[\s._\-*~]+/);
  if (parts.length < 3) return normalizeForModeration(text);

  const joined = parts.every((p) => p.length === 1)
    ? parts.join("")
    : parts.filter((p) => p.length === 1).join("");

  if (joined.length >= 3) {
    return `${normalizeForModeration(text)} ${joined}`;
  }
  return normalizeForModeration(text);
}

/** All normalized views used by the local filter */
export function moderationViews(text: string): {
  loose: string;
  tight: string;
  spaced: string;
} {
  const loose = normalizeForModeration(text);
  const tight = collapseToAlphanumeric(text);
  const spaced = joinSpacedLetters(text);
  return { loose, tight, spaced: collapseToAlphanumeric(spaced) };
}
