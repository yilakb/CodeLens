const SPEAKER_CLAIM_PREFIXES = [
  /^the speaker(?:'s|’s)\s+claim\s+is(?:\s+that)?\s*[:,\-–—]?\s*/i,
  /^(?:the\s+)?speaker\s+(?:claims?|states?|argues?|asserts?|says?|contends?|maintains?|reports?|suggests?|recommends?)(?:\s+that)?\s*[:,\-–—]?\s*/i,
  /^according\s+to\s+the\s+speaker\s*[:,\-–—]?\s*/i,
];

export function formatTechnicalClaim(value: string): string {
  let claim = value.trim().replace(/^claim\s*[:\-–—]\s*/i, "");
  for (const prefix of SPEAKER_CLAIM_PREFIXES) {
    claim = claim.replace(prefix, "");
  }

  if (!claim) return "Claim";
  const sentence = `${claim.charAt(0).toUpperCase()}${claim.slice(1)}`;
  return `Claim: ${sentence}`;
}
