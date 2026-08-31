const SUPPORTED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "x.com",
  "twitter.com",
  "vimeo.com",
  "tiktok.com",
  "facebook.com",
  "fb.watch",
] as const;

function isSupportedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  return SUPPORTED_HOSTS.some(
    (host) => normalized === host || normalized.endsWith(`.${host}`),
  );
}

export function validateVideoUrl(input: unknown): URL {
  if (typeof input !== "string" || input.trim().length === 0 || input.length > 2048) {
    throw new Error("Enter a valid video URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error("Enter a complete video URL, including https://.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http and https video URLs are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Video URLs containing credentials are not allowed.");
  }
  if (!isSupportedHostname(parsed.hostname)) {
    throw new Error(
      "This platform is not supported. Try YouTube, Instagram, X, Vimeo, TikTok, or Facebook.",
    );
  }

  return parsed;
}

export const supportedVideoHosts = [...SUPPORTED_HOSTS];
