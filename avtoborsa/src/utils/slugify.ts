/**
 * Slugify utility functions for creating SEO-friendly URLs
 */
import type { NavigateFunction, NavigateOptions } from "react-router-dom";

const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_ENV_VALUES = new Set(["0", "false", "no", "off"]);
const DEFAULT_RESERVED_DEALER_SUBDOMAINS = ["www", "api"];
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const toSlugPart = (value: string): string => {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "dealer";
};

const parseEnvFlag = (value: unknown, defaultValue = false): boolean => {
  if (typeof value !== "string") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (TRUE_ENV_VALUES.has(normalized)) return true;
  if (FALSE_ENV_VALUES.has(normalized)) return false;
  return defaultValue;
};

const normalizeHostname = (value: string): string =>
  value.trim().toLowerCase().replace(/:\d+$/, "").replace(/^\.+|\.+$/g, "");

export const getPublicBaseUrl = (): string => {
  const envValue =
    (import.meta.env.VITE_PUBLIC_BASE_URL || import.meta.env.VITE_APP_BASE_URL || "").toString().trim();
  if (envValue) return envValue.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

export const getDealerRootDomain = (): string => {
  const explicitDomain = (import.meta.env.VITE_DEALER_ROOT_DOMAIN || "").toString().trim().toLowerCase();
  if (explicitDomain) return normalizeHostname(explicitDomain);

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) return "";

  try {
    const host = normalizeHostname(new URL(baseUrl).hostname);
    if (host.startsWith("www.")) return host.slice(4);
    return host;
  } catch {
    return "";
  }
};

const resolveDealerProtocol = (): string => {
  const baseUrl = getPublicBaseUrl();
  if (baseUrl) {
    try {
      const protocol = new URL(baseUrl).protocol.replace(":", "");
      if (protocol) return protocol;
    } catch {
      // fall through to runtime protocol
    }
  }

  if (typeof window !== "undefined") {
    const runtimeProtocol = window.location.protocol.replace(":", "");
    if (runtimeProtocol) return runtimeProtocol;
  }

  return "https";
};

const resolveReservedDealerSubdomains = (): Set<string> => {
  const configured = (import.meta.env.VITE_DEALER_RESERVED_SUBDOMAINS || "").toString().trim();
  const values = configured
    ? configured
        .split(",")
        .map((part: string) => part.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_RESERVED_DEALER_SUBDOMAINS;
  return new Set(values);
};

export const isDealerSubdomainRoutingEnabled = (): boolean =>
  parseEnvFlag(import.meta.env.VITE_DEALER_SUBDOMAIN_ENABLED, false);

/**
 * Extract ID from listing slug
 * Example: "obiava-3-audi-a6" -> 3
 */
export const extractIdFromSlug = (slug: string): number | null => {
  const match = slug.match(/^obiava-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Build unique, readable dealer slug URL part.
 * Example: ("Авто Къща") -> "авто-къща"
 */
export const buildDealerSlug = (dealerName: string, _dealerId?: number): string =>
  toSlugPart(dealerName);

/**
 * Extract legacy dealer ID from old dealer slug or numeric id.
 * Examples: "авто-къща-12" -> 12, "12" -> 12
 */
export const extractDealerIdFromSlug = (value: string): number | null => {
  const normalized = (value || "").trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const parsed = parseInt(normalized, 10);
    return parsed > 0 ? parsed : null;
  }

  const match = normalized.match(/-(\d+)$/);
  if (!match) return null;

  const parsed = parseInt(match[1], 10);
  return parsed > 0 ? parsed : null;
};

export const buildDealerProfilePath = (dealerName: string, dealerId: number): string =>
  `/dealers/${buildDealerSlug(dealerName, dealerId)}`;

export const buildDealerProfileUrl = (dealerName: string, dealerId: number): string => {
  const fallbackPath = buildDealerProfilePath(dealerName, dealerId);
  if (!isDealerSubdomainRoutingEnabled()) return fallbackPath;

  const rootDomain = getDealerRootDomain();
  const slug = buildDealerSlug(dealerName, dealerId);
  if (!rootDomain || !slug) return fallbackPath;

  const protocol = resolveDealerProtocol();
  return `${protocol}://${slug}.${rootDomain}`;
};

export const toAbsoluteUrl = (value: string): string => {
  const normalizedValue = (value || "").trim();
  if (!normalizedValue) return normalizedValue;
  if (ABSOLUTE_URL_PATTERN.test(normalizedValue)) return normalizedValue;

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) return normalizedValue;

  try {
    return new URL(normalizedValue, baseUrl).href;
  } catch {
    return normalizedValue;
  }
};

export const resolveDealerSlugFromHostname = (hostname: string): string | null => {
  if (!isDealerSubdomainRoutingEnabled()) return null;

  const normalizedHost = normalizeHostname(hostname);
  const rootDomain = getDealerRootDomain();
  if (!normalizedHost || !rootDomain) return null;
  if (normalizedHost === rootDomain) return null;
  if (!normalizedHost.endsWith(`.${rootDomain}`)) return null;

  const prefix = normalizedHost.slice(0, -(rootDomain.length + 1));
  if (!prefix || prefix.includes(".")) return null;

  const candidateSlug = prefix.trim().toLowerCase();
  if (!candidateSlug) return null;
  if (resolveReservedDealerSubdomains().has(candidateSlug)) return null;
  return candidateSlug;
};

export const resolveDealerSlugFromCurrentHost = (): string | null => {
  if (typeof window === "undefined") return null;
  return resolveDealerSlugFromHostname(window.location.hostname);
};

export const navigateToDealerProfile = (
  navigate: NavigateFunction,
  dealerName: string,
  dealerId: number,
  options?: NavigateOptions
): void => {
  const target = buildDealerProfileUrl(dealerName, dealerId);
  if (ABSOLUTE_URL_PATTERN.test(target)) {
    if (typeof window !== "undefined") {
      window.location.assign(target);
    }
    return;
  }
  navigate(target, options);
};
