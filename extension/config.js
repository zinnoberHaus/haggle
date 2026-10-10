// Replaced with the verified production domain before the downloadable ZIP is built.
export const DEFAULT_SITE_URL = "https://haggle-blue.vercel.app";

export function normalizeSiteUrl(value) {
  const url = new URL(value);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(isLocal && url.protocol === "http:"))
  ) {
    throw new Error("Use an HTTPS site address, or HTTP on localhost.");
  }
  return url.origin;
}

export function makeSearchUrl(siteUrl, query) {
  const text = String(query || "")
    .trim()
    .slice(0, 500);
  if (!text) throw new Error("Enter a product name or shopping question.");
  const url = new URL("/ask", normalizeSiteUrl(siteUrl));
  url.searchParams.set("q", text);
  return url.href;
}

export async function getSiteUrl() {
  const { siteUrl } = await chrome.storage.local.get("siteUrl");
  try {
    return normalizeSiteUrl(siteUrl || DEFAULT_SITE_URL);
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export async function openSearch(query) {
  const url = makeSearchUrl(await getSiteUrl(), query);
  await chrome.tabs.create({ url });
}
