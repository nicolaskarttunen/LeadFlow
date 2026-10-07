import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 750_000;
const TIMEOUT_MS = 8_000;
const MAX_CONTACT_PAGES = 2;

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const value = ip.toLowerCase();
  return value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
}

async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported website protocol.");
  if (url.username || url.password) throw new Error("Website credentials are not allowed.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Private website targets are blocked.");
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Private website targets are blocked.");
  } else {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("Private website targets are blocked.");
  }
  return url;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ");
}

function cleanText(value?: string | null) {
  return value ? decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 500) : null;
}

function match(html: string, pattern: RegExp) {
  return cleanText(html.match(pattern)?.[1]);
}

function visibleText(html: string) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractEmails(html: string) {
  const blockedLocalParts = new Set(["noreply", "no-reply", "donotreply", "do-not-reply"]);
  const blockedTlds = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "css", "js"]);

  return Array.from(
    new Set(
      (decodeHtml(html).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
        .map((email) => email.toLowerCase().replace(/^mailto:/, "").trim())
        .filter((email) => {
          const [local, domain] = email.split("@");
          if (!local || !domain || blockedLocalParts.has(local)) return false;
          const tld = domain.split(".").pop() ?? "";
          return !blockedTlds.has(tld);
        }),
    ),
  ).slice(0, 10);
}

function extractContactUrls(html: string, baseUrl: string) {
  const origin = new URL(baseUrl).origin;
  const urls: string[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  for (const anchor of html.matchAll(anchorPattern)) {
    const href = decodeHtml(anchor[1] ?? "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (!/(contact|yhteystiedot|yhteydenotto|ota-yhteytta|ota-yhteyttä|kontakt)/i.test(href)) continue;

    try {
      const url = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) continue;
      url.hash = "";
      const normalized = url.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(normalized);
      if (urls.length >= MAX_CONTACT_PAGES) break;
    } catch {
      continue;
    }
  }

  return urls;
}

type FetchedPage = {
  finalUrl: string;
  html: string;
  pageText: string;
};

async function fetchPublicHtml(startUrl: string): Promise<FetchedPage> {
  let current = (await assertPublicUrl(startUrl)).toString();

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "LeadFlowResearch/0.1" },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Website returned an invalid redirect.");
      current = (await assertPublicUrl(new URL(location, current).toString())).toString();
      continue;
    }

    if (!response.ok && current.startsWith("http://")) {
      current = (await assertPublicUrl(current.replace(/^http:\/\//i, "https://"))).toString();
      continue;
    }
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) throw new Error("Website did not return HTML.");

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BYTES) throw new Error("Website response is too large.");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Website response body is unavailable.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Website response is too large.");
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const html = new TextDecoder().decode(bytes);
    return { finalUrl: current, html, pageText: visibleText(html) };
  }

  throw new Error("Website redirected too many times.");
}

export type WebsiteResearch = {
  finalUrl: string;
  httpsEnabled: boolean;
  pageTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  emails: string[];
  emailSources: Array<{ email: string; sourceUrl: string }>;
  hasPhone: boolean;
  hasContactLink: boolean;
  hasPrimaryCta: boolean;
  visibleTextLength: number;
};

export async function researchPublicWebsite(startUrl: string): Promise<WebsiteResearch> {
  let initial = startUrl.trim();
  if (!/^https?:\/\//i.test(initial)) initial = `https://${initial}`;

  const homepage = await fetchPublicHtml(initial);
  const { finalUrl, html, pageText } = homepage;
  const pageTitle = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    ?? match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1 = match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const contactUrls = extractContactUrls(html, finalUrl);
  const emailSourceMap = new Map<string, string>();

  for (const email of extractEmails(html)) emailSourceMap.set(email, finalUrl);

  let hasPhone = /(?:\+358|0)\s?(?:\d[\s-]?){6,12}/.test(pageText);
  const hasContactLink = contactUrls.length > 0;
  const hasPrimaryCta = /(ota yhteyttä|pyydä tarjous|varaa aika|varaa nyt|tilaa|kysy lisää|request a quote|contact us|book now|book an appointment|get in touch)/i.test(pageText);

  for (const contactUrl of contactUrls) {
    try {
      const contactPage = await fetchPublicHtml(contactUrl);
      for (const email of extractEmails(contactPage.html)) {
        if (!emailSourceMap.has(email)) emailSourceMap.set(email, contactPage.finalUrl);
      }
      hasPhone ||= /(?:\+358|0)\s?(?:\d[\s-]?){6,12}/.test(contactPage.pageText);
    } catch (error) {
      console.error("Contact page research failed", { contactUrl, error });
    }
  }

  const emailSources = Array.from(emailSourceMap.entries())
    .slice(0, 10)
    .map(([email, sourceUrl]) => ({ email, sourceUrl }));

  return {
    finalUrl,
    httpsEnabled: finalUrl.startsWith("https://"),
    pageTitle,
    metaDescription,
    h1,
    emails: emailSources.map((item) => item.email),
    emailSources,
    hasPhone,
    hasContactLink,
    hasPrimaryCta,
    visibleTextLength: pageText.length,
  };
}
