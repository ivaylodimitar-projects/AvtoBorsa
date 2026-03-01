import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
const ACCESS_TOKEN_KEY = "authToken";

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type TabKey =
  | "dashboard"
  | "listings"
  | "users"
  | "transactions"
  | "extensionApi"
  | "reports"
  | "contactInquiries";
type Tone = "default" | "success" | "warning" | "danger" | "info";
type TransactionsInnerTab = "topups" | "sitePurchases";
type ListingDeleteReason =
  | "fraud_suspicion"
  | "suspicious_links"
  | "prohibited_content"
  | "duplicate_listing"
  | "wrong_category"
  | "other";

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface Paged<T> {
  results: T[];
  pagination: Pagination;
}

interface Overview {
  totals: {
    users_total: number;
    listings_active: number;
    listings_requires_moderation?: number;
    views_total: number;
    transactions_total: number;
    transactions_amount_total: number;
    site_purchases_total?: number;
    site_purchases_amount_total?: number;
    reports_total: number;
    contact_inquiries_total?: number;
    contact_inquiries_new?: number;
  };
  series: {
    views_last_14_days: Array<{ date: string; count: number }>;
    purchases_last_14_days: Array<{ date: string; count: number }>;
  };
}

interface AdminListing {
  id: number;
  brand: string;
  model: string;
  title: string | null;
  city: string;
  price: number;
  view_count: number;
  listing_type: "normal" | "top" | "vip";
  top_plan: "1d" | "7d" | null;
  top_expires_at: string | null;
  vip_plan: "7d" | "lifetime" | null;
  vip_expires_at: string | null;
  is_draft: boolean;
  is_archived: boolean;
  is_expired: boolean;
  risk_score: number;
  risk_flags: string[];
  requires_moderation: boolean;
  seller_name: string;
  user_email: string;
}

interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: "private" | "business";
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  balance: number;
  listing_count: number;
  total_views: number;
}

interface AdminTransaction {
  id: number;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  credited: boolean;
  created_at: string;
  stripe_session_id: string;
}

interface AdminSitePurchase {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  listing_id: number | null;
  listing_title: string;
  listing_brand: string;
  listing_model: string;
  listing_type: "top" | "vip";
  plan: string;
  source: "publish" | "republish" | "promote" | "unknown";
  amount: number;
  base_amount: number;
  discount_ratio: number | null;
  currency: string;
  created_at: string;
}

interface SitePurchaseBreakdownEntry {
  listing_type?: string;
  source?: string;
  plan?: string;
  count: number;
  amount: number;
}

interface SitePurchaseTopListing {
  listing_id: number;
  title: string;
  brand: string;
  model: string;
  count: number;
  amount: number;
}

interface SitePurchaseTopUser {
  user_id: number;
  email: string;
  name: string;
  count: number;
  amount: number;
}

interface SitePurchaseDailySeries {
  date: string;
  count: number;
  amount: number;
}

interface SitePurchaseSummary {
  totals: {
    count: number;
    amount: number;
  };
  breakdown: {
    by_type: SitePurchaseBreakdownEntry[];
    by_source: SitePurchaseBreakdownEntry[];
    by_plan: SitePurchaseBreakdownEntry[];
  };
  top: {
    listings: SitePurchaseTopListing[];
    users: SitePurchaseTopUser[];
  };
  series: {
    daily_last_30_days: SitePurchaseDailySeries[];
  };
}

interface AdminSitePurchaseResponse extends Paged<AdminSitePurchase> {
  summary: SitePurchaseSummary;
}

interface AdminExtensionUsageEvent {
  id: number;
  created_at: string;
  user_id: number | null;
  user_email: string;
  user_name: string;
  key_prefix: string;
  endpoint: string;
  request_method: string;
  source: "extension" | "public_api" | "unknown" | string;
  source_host: string;
  status_code: number;
  success: boolean;
  lot_number: string;
  source_url: string;
  imported_listing_id: number | null;
  imported_listing_slug: string;
  imported_listing_title: string;
  request_ip: string | null;
  user_agent: string;
  extension_version: string;
  payload_bytes: number | null;
  duration_ms: number | null;
  error_message: string;
}

interface ExtensionUsageBreakdownEntry {
  source?: string;
  source_host?: string;
  status_code?: number;
  count: number;
}

interface ExtensionUsageTopUser {
  user_id: number;
  email: string;
  name: string;
  count: number;
  success: number;
  failed: number;
  imports: number;
  last_used: string | null;
}

interface ExtensionUsageDailySeries {
  date: string;
  count: number;
  success: number;
  failed: number;
}

interface ExtensionUsageSummary {
  totals: {
    requests: number;
    success: number;
    failed: number;
    success_rate: number;
    unique_users: number;
    imports: number;
    avg_duration_ms: number | null;
  };
  breakdown: {
    by_status: ExtensionUsageBreakdownEntry[];
    by_source: ExtensionUsageBreakdownEntry[];
    by_host: ExtensionUsageBreakdownEntry[];
  };
  top: {
    users: ExtensionUsageTopUser[];
  };
  series: {
    daily_last_30_days: ExtensionUsageDailySeries[];
  };
}

interface AdminExtensionUsageResponse extends Paged<AdminExtensionUsageEvent> {
  summary: ExtensionUsageSummary;
}

interface AdminReport {
  id: number;
  listing_id: number;
  listing_brand: string;
  listing_model: string;
  user_email: string;
  incorrect_price: boolean;
  other_issue: boolean;
  message: string;
  created_at: string;
}

interface AdminContactInquiry {
  id: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: "new" | "replied" | string;
  admin_reply: string;
  customer_reply: string;
  customer_replied_at: string | null;
  replied_at: string | null;
  replied_by_id: number | null;
  replied_by_email: string;
  created_at: string;
  updated_at: string;
}

interface AdminContactInquirySummary {
  total: number;
  new: number;
  replied: number;
}

interface AdminContactInquiryResponse extends Paged<AdminContactInquiry> {
  summary: AdminContactInquirySummary;
}

interface AuthUserPayload {
  id: number;
  email: string;
  userType: "private" | "business";
  username?: string;
  balance?: number;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
  created_at?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_admin?: boolean;
  isAdmin?: boolean;
}

interface AdminLoginCodeRequestResponse {
  challenge_id: string;
  masked_email: string;
  expires_in_seconds: number;
}

interface AdminLoginVerifyResponse {
  access: string;
  user: AuthUserPayload;
}

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "dashboard", label: "Dashboard", hint: "metrics" },
  { key: "listings", label: "Listings", hint: "ads" },
  { key: "users", label: "Users", hint: "accounts" },
  { key: "transactions", label: "Transactions", hint: "payments" },
  { key: "extensionApi", label: "Extension API", hint: "usage" },
  { key: "reports", label: "Reports", hint: "issues" },
  { key: "contactInquiries", label: "Contacts", hint: "inbox" },
];

const color = {
  bg: "#edf2f7",
  panel: "#ffffff",
  border: "#d7e0ea",
  borderStrong: "#bdc9d7",
  text: "#0f172a",
  muted: "#475569",
  accent: "#0d6dbb",
  accentSoft: "#eaf4ff",
  danger: "#b42318",
  dangerSoft: "#ffe4e6",
  success: "#047857",
  successSoft: "#dcfce7",
  warn: "#92400e",
  warnSoft: "#fef3c7",
  info: "#1d4ed8",
  infoSoft: "#dbeafe",
};

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const data = payload as Record<string, unknown>;
    throw new HttpError(
      (typeof data.error === "string" && data.error) ||
        (typeof data.detail === "string" && data.detail) ||
        `Request failed (${response.status})`,
      response.status
    );
  }

  return payload as T;
};

const _decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
};

const hasAdminPanelVerifiedClaim = (): boolean => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return false;
  const payload = _decodeJwtPayload(token);
  return Boolean(payload?.admin_panel_verified);
};

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const fmtDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("bg-BG");
};

const pageLabel = (pagination: Pagination | null | undefined) => {
  if (!pagination || pagination.total === 0) return "0 results";
  const start = (pagination.page - 1) * pagination.page_size + 1;
  const end = Math.min(pagination.page * pagination.page_size, pagination.total);
  return `${start}-${end} of ${pagination.total}`;
};

const LISTING_DELETE_REASON_OPTIONS: Array<{ value: ListingDeleteReason; label: string }> = [
  { value: "fraud_suspicion", label: "Fraud / misleading info" },
  { value: "suspicious_links", label: "Suspicious links / external contacts" },
  { value: "prohibited_content", label: "Prohibited content" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "wrong_category", label: "Wrong category / invalid data" },
  { value: "other", label: "Other" },
];

const panelStyle: React.CSSProperties = {
  background: color.panel,
  border: `1px solid ${color.border}`,
  borderRadius: 16,
  padding: 14,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${color.border}`,
  borderRadius: 16,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: color.muted,
  background: "#f8fafc",
  borderBottom: `1px solid ${color.border}`,
  padding: "10px 12px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  borderBottom: `1px solid ${color.border}`,
  padding: "10px 12px",
  verticalAlign: "top",
  fontSize: 14,
  color: color.text,
};

const inputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 16,
  border: `1px solid ${color.borderStrong}`,
  padding: "0 12px",
  minWidth: 260,
};

const buttonStyle = (variant: "primary" | "neutral" | "danger" = "neutral"): React.CSSProperties => {
  if (variant === "primary") {
    return {
      height: 34,
      padding: "0 12px",
      borderRadius: 16,
      border: `1px solid ${color.accent}`,
      background: color.accent,
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
    };
  }

  if (variant === "danger") {
    return {
      height: 34,
      padding: "0 12px",
      borderRadius: 16,
      border: "1px solid #f2b8bf",
      background: "#fff",
      color: color.danger,
      cursor: "pointer",
      fontSize: 13,
    };
  }

  return {
    height: 34,
    padding: "0 12px",
    borderRadius: 16,
    border: `1px solid ${color.borderStrong}`,
    background: "#fff",
    color: color.text,
    cursor: "pointer",
    fontSize: 13,
  };
};

const badgeStyle = (tone: Tone): React.CSSProperties => {
  const tones: Record<Tone, { bg: string; text: string }> = {
    default: { bg: "#e2e8f0", text: "#334155" },
    success: { bg: color.successSoft, text: color.success },
    warning: { bg: color.warnSoft, text: color.warn },
    danger: { bg: color.dangerSoft, text: color.danger },
    info: { bg: color.infoSoft, text: color.info },
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    height: 22,
    borderRadius: 999,
    padding: "0 9px",
    fontSize: 12,
    fontWeight: 600,
    background: tones[tone].bg,
    color: tones[tone].text,
  };
};

const resolveListingStatus = (item: AdminListing): { label: string; tone: Tone } => {
  if (item.is_draft) return { label: "Draft", tone: "warning" };
  if (item.is_archived) return { label: "Archived", tone: "default" };
  if (item.is_expired) return { label: "Expired", tone: "danger" };
  return { label: "Active", tone: "success" };
};

const resolveListingTypeLabel = (item: AdminListing): string => {
  if (item.listing_type === "top") return `TOP ${item.top_plan === "7d" ? "7d" : "1d"}`;
  if (item.listing_type === "vip") return `VIP ${item.vip_plan === "lifetime" ? "lifetime" : "7d"}`;
  return "NORMAL";
};

const resolveListingPromoExpiry = (item: AdminListing): string | null => {
  if (item.listing_type === "top" && item.top_expires_at) return `Top expires: ${fmtDateTime(item.top_expires_at)}`;
  if (item.listing_type === "vip" && item.vip_expires_at) return `VIP expires: ${fmtDateTime(item.vip_expires_at)}`;
  return null;
};

const userName = (item: AdminUser) => {
  const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
  return fullName || item.username || item.email;
};

const roleBadge = (item: AdminUser): { label: string; tone: Tone } => {
  if (item.is_superuser) return { label: "Superuser", tone: "info" };
  if (item.is_staff) return { label: "Admin", tone: "success" };
  return { label: "User", tone: "default" };
};

const txTone = (status: string): Tone => {
  const value = String(status || "").toLowerCase();
  if (value === "succeeded") return "success";
  if (value === "pending") return "warning";
  if (value === "failed" || value === "cancelled") return "danger";
  return "default";
};

const purchaseTypeLabel = (value: string) => {
  if (value === "top") return "TOP";
  if (value === "vip") return "VIP";
  return value || "-";
};

const purchaseSourceLabel = (value: string) => {
  if (value === "publish") return "Publish";
  if (value === "republish") return "Republish";
  if (value === "promote") return "Promote";
  return "Unknown";
};

const purchaseSourceTone = (value: string): Tone => {
  if (value === "publish") return "info";
  if (value === "republish") return "warning";
  if (value === "promote") return "success";
  return "default";
};

const extensionSourceLabel = (value: string) => {
  if (value === "extension") return "Extension";
  if (value === "public_api") return "Public API";
  if (value === "unknown") return "Unknown";
  return value || "-";
};

const extensionSourceTone = (value: string): Tone => {
  if (value === "extension") return "info";
  if (value === "public_api") return "success";
  if (value === "unknown") return "warning";
  return "default";
};

const extensionStatusTone = (statusCode: number, success: boolean): Tone => {
  if (success) return "success";
  if (statusCode >= 500) return "danger";
  if (statusCode >= 400) return "warning";
  return "default";
};

const resolveContactInquiryStatus = (item: AdminContactInquiry): { label: string; tone: Tone } => {
  if (item.status === "new" && item.customer_replied_at) return { label: "Customer replied", tone: "info" };
  if (item.status === "new") return { label: "New", tone: "warning" };
  if (item.status === "replied") return { label: "Replied", tone: "success" };
  return { label: item.status || "Unknown", tone: "default" };
};

const AdminPage: React.FC = () => {
  const { user, isLoading, logout, setUserFromToken } = useAuth();

  const [tab, setTab] = useState<TabKey>("dashboard");
  const [error, setError] = useState("");
  const [adminAccessDenied, setAdminAccessDenied] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginStep, setLoginStep] = useState<"credentials" | "code">("credentials");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginMaskedEmail, setLoginMaskedEmail] = useState("");
  const [loginCodeExpiresIn, setLoginCodeExpiresIn] = useState<number | null>(null);
  const [pendingLoginEmail, setPendingLoginEmail] = useState("");
  const [pendingLoginPassword, setPendingLoginPassword] = useState("");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<Paged<AdminListing> | null>(null);
  const [users, setUsers] = useState<Paged<AdminUser> | null>(null);
  const [transactions, setTransactions] = useState<Paged<AdminTransaction> | null>(null);
  const [sitePurchases, setSitePurchases] = useState<AdminSitePurchaseResponse | null>(null);
  const [extensionUsage, setExtensionUsage] = useState<AdminExtensionUsageResponse | null>(null);
  const [reports, setReports] = useState<Paged<AdminReport> | null>(null);
  const [contactInquiries, setContactInquiries] = useState<AdminContactInquiryResponse | null>(null);
  const [transactionsInnerTab, setTransactionsInnerTab] = useState<TransactionsInnerTab>("topups");

  const [listingQ, setListingQ] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState<"all" | "active" | "draft" | "archived" | "expired">("all");
  const [listingTypeFilter, setListingTypeFilter] = useState<"" | "normal" | "top" | "vip">("");
  const [listingSellerTypeFilter, setListingSellerTypeFilter] = useState<"" | "private" | "business">("");
  const [listingModerationFilter, setListingModerationFilter] = useState<"" | "review" | "clean">("");
  const [listingSort, setListingSort] = useState<
    | "newest"
    | "oldest"
    | "price_asc"
    | "price_desc"
    | "views_desc"
    | "views_asc"
    | "updated_desc"
    | "updated_asc"
    | "risk_desc"
    | "risk_asc"
  >("newest");
  const [userQ, setUserQ] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"" | "private" | "business">("");
  const [userAdminFilter, setUserAdminFilter] = useState<"" | "true" | "false">("");
  const [userActiveFilter, setUserActiveFilter] = useState<"" | "true" | "false">("");
  const [userSort, setUserSort] = useState<
    "newest" | "oldest" | "listings_desc" | "listings_asc" | "views_desc" | "views_asc" | "email_asc" | "email_desc"
  >("newest");
  const [txQ, setTxQ] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<"" | "pending" | "succeeded" | "failed" | "cancelled">("");
  const [txCreditedFilter, setTxCreditedFilter] = useState<"" | "true" | "false">("");
  const [txSort, setTxSort] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");
  const [sitePurchaseQ, setSitePurchaseQ] = useState("");
  const [sitePurchaseTypeFilter, setSitePurchaseTypeFilter] = useState<"" | "top" | "vip">("");
  const [sitePurchaseSourceFilter, setSitePurchaseSourceFilter] = useState<
    "" | "publish" | "republish" | "promote" | "unknown"
  >("");
  const [extensionQ, setExtensionQ] = useState("");
  const [extensionSuccessFilter, setExtensionSuccessFilter] = useState<"" | "true" | "false">("");
  const [extensionSourceFilter, setExtensionSourceFilter] = useState<"" | "extension" | "public_api" | "unknown">("");
  const [extensionHasImportFilter, setExtensionHasImportFilter] = useState<"" | "true" | "false">("");
  const [extensionSort, setExtensionSort] = useState<
    "newest" | "oldest" | "status_desc" | "status_asc" | "duration_desc" | "duration_asc"
  >("newest");
  const [reportQ, setReportQ] = useState("");
  const [contactInquiryQ, setContactInquiryQ] = useState("");
  const [contactInquiryStatusFilter, setContactInquiryStatusFilter] = useState<"" | "new" | "replied">("");
  const [contactInquirySort, setContactInquirySort] = useState<"newest" | "oldest">("newest");

  const [listingPage, setListingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [sitePurchasePage, setSitePurchasePage] = useState(1);
  const [extensionPage, setExtensionPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [contactInquiryPage, setContactInquiryPage] = useState(1);
  const [topListingsPage, setTopListingsPage] = useState(1);
  const [topBuyersPage, setTopBuyersPage] = useState(1);
  const [plansPage, setPlansPage] = useState(1);
  const [extensionTopUsersPage, setExtensionTopUsersPage] = useState(1);
  const [extensionHostsPage, setExtensionHostsPage] = useState(1);
  const [replyModalInquiry, setReplyModalInquiry] = useState<AdminContactInquiry | null>(null);
  const [replyModalSubject, setReplyModalSubject] = useState("");
  const [replyModalMessage, setReplyModalMessage] = useState("");
  const [deleteModalListing, setDeleteModalListing] = useState<AdminListing | null>(null);
  const [deleteReason, setDeleteReason] = useState<ListingDeleteReason>("fraud_suspicion");
  const [deleteCustomReason, setDeleteCustomReason] = useState("");

  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);
  const isAdminSessionVerified = isAdmin ? hasAdminPanelVerifiedClaim() : false;
  const shouldShowAdminLogin = !user || !isAdmin || !isAdminSessionVerified || adminAccessDenied;
  const isSuperuser = Boolean(user?.is_superuser);
  const currentUserId = user?.id || null;

  const isForbiddenError = useCallback((err: unknown) => {
    return err instanceof HttpError && err.status === 403;
  }, []);

  const handleAdminRequestError = useCallback(
    (err: unknown, fallbackMessage = "Request failed") => {
      if (isForbiddenError(err)) {
        setAdminAccessDenied(true);
        setError("Нямаш достъп до админ панела. Влез с админ акаунт.");
        return;
      }
      setError(err instanceof Error ? err.message : fallbackMessage);
    },
    [isForbiddenError]
  );

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setOverview(await request<Overview>("/api/admin/overview/"));
  }, [isAdmin]);

  const loadListings = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(listingPage), page_size: "20" });
    if (listingQ.trim()) q.set("q", listingQ.trim());
    if (listingStatusFilter !== "all") q.set("status", listingStatusFilter);
    if (listingTypeFilter) q.set("listing_type", listingTypeFilter);
    if (listingSellerTypeFilter) q.set("seller_type", listingSellerTypeFilter);
    if (listingModerationFilter) q.set("moderation", listingModerationFilter);
    q.set("sort", listingSort);
    setListings(await request<Paged<AdminListing>>(`/api/admin/listings/?${q.toString()}`));
  }, [
    isAdmin,
    listingPage,
    listingQ,
    listingStatusFilter,
    listingTypeFilter,
    listingSellerTypeFilter,
    listingModerationFilter,
    listingSort,
  ]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(userPage), page_size: "20" });
    if (userQ.trim()) q.set("q", userQ.trim());
    if (userTypeFilter) q.set("user_type", userTypeFilter);
    if (userAdminFilter) q.set("is_admin", userAdminFilter);
    if (userActiveFilter) q.set("is_active", userActiveFilter);
    q.set("sort", userSort);
    setUsers(await request<Paged<AdminUser>>(`/api/admin/users/?${q.toString()}`));
  }, [isAdmin, userPage, userQ, userTypeFilter, userAdminFilter, userActiveFilter, userSort]);

  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(txPage), page_size: "20" });
    if (txQ.trim()) q.set("q", txQ.trim());
    if (txStatusFilter) q.set("status", txStatusFilter);
    if (txCreditedFilter) q.set("credited", txCreditedFilter);
    q.set("sort", txSort);
    setTransactions(await request<Paged<AdminTransaction>>(`/api/admin/transactions/?${q.toString()}`));
  }, [isAdmin, txPage, txQ, txStatusFilter, txCreditedFilter, txSort]);

  const loadSitePurchases = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(sitePurchasePage), page_size: "20" });
    if (sitePurchaseQ.trim()) q.set("q", sitePurchaseQ.trim());
    if (sitePurchaseTypeFilter) q.set("listing_type", sitePurchaseTypeFilter);
    if (sitePurchaseSourceFilter) q.set("source", sitePurchaseSourceFilter);
    setSitePurchases(
      await request<AdminSitePurchaseResponse>(`/api/admin/site-purchases/?${q.toString()}`)
    );
  }, [isAdmin, sitePurchasePage, sitePurchaseQ, sitePurchaseTypeFilter, sitePurchaseSourceFilter]);

  const loadExtensionUsage = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(extensionPage), page_size: "20" });
    if (extensionQ.trim()) q.set("q", extensionQ.trim());
    if (extensionSuccessFilter) q.set("success", extensionSuccessFilter);
    if (extensionSourceFilter) q.set("source", extensionSourceFilter);
    if (extensionHasImportFilter) q.set("has_import", extensionHasImportFilter);
    q.set("sort", extensionSort);
    setExtensionUsage(await request<AdminExtensionUsageResponse>(`/api/admin/extension-usage/?${q.toString()}`));
  }, [
    isAdmin,
    extensionPage,
    extensionQ,
    extensionSuccessFilter,
    extensionSourceFilter,
    extensionHasImportFilter,
    extensionSort,
  ]);

  const loadReports = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(reportPage), page_size: "20" });
    if (reportQ.trim()) q.set("q", reportQ.trim());
    setReports(await request<Paged<AdminReport>>(`/api/admin/reports/?${q.toString()}`));
  }, [isAdmin, reportPage, reportQ]);

  const loadContactInquiries = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(contactInquiryPage), page_size: "20" });
    if (contactInquiryQ.trim()) q.set("q", contactInquiryQ.trim());
    if (contactInquiryStatusFilter) q.set("status", contactInquiryStatusFilter);
    q.set("sort", contactInquirySort);
    setContactInquiries(
      await request<AdminContactInquiryResponse>(`/api/admin/contact-inquiries/?${q.toString()}`)
    );
  }, [isAdmin, contactInquiryPage, contactInquiryQ, contactInquiryStatusFilter, contactInquirySort]);

  const loadByTab = useCallback(async () => {
    try {
      setError("");
      if (tab === "dashboard") await loadOverview();
      if (tab === "listings") await loadListings();
      if (tab === "users") await loadUsers();
      if (tab === "transactions") {
        await Promise.all([loadTransactions(), loadSitePurchases()]);
      }
      if (tab === "extensionApi") await loadExtensionUsage();
      if (tab === "reports") await loadReports();
      if (tab === "contactInquiries") await loadContactInquiries();
    } catch (err) {
      handleAdminRequestError(err, "Request failed");
    }
  }, [
    tab,
    loadOverview,
    loadListings,
    loadUsers,
    loadTransactions,
    loadSitePurchases,
    loadExtensionUsage,
    loadReports,
    loadContactInquiries,
    handleAdminRequestError,
  ]);

  useEffect(() => {
    if (!isAdmin || adminAccessDenied || !isAdminSessionVerified) return;
    void loadOverview().catch((err) => handleAdminRequestError(err, "Request failed"));
  }, [isAdmin, adminAccessDenied, isAdminSessionVerified, loadOverview, handleAdminRequestError]);

  useEffect(() => {
    if (!isAdmin || adminAccessDenied || !isAdminSessionVerified) return;
    void loadByTab();
  }, [isAdmin, adminAccessDenied, isAdminSessionVerified, loadByTab]);

  useEffect(() => {
    if (tab !== "transactions") return;
    setTransactionsInnerTab("topups");
  }, [tab]);

  useEffect(() => {
    setTopListingsPage(1);
    setTopBuyersPage(1);
    setPlansPage(1);
  }, [sitePurchases?.summary.top.listings.length, sitePurchases?.summary.top.users.length, sitePurchases?.summary.breakdown.by_plan.length]);

  useEffect(() => {
    setExtensionTopUsersPage(1);
    setExtensionHostsPage(1);
  }, [extensionUsage?.summary.top.users.length, extensionUsage?.summary.breakdown.by_host.length]);

  const requestAdminLoginCode = async (rawEmail: string, rawPassword: string) => {
    setLoginError("");
    setLoginBusy(true);
    try {
      const payload = await request<AdminLoginCodeRequestResponse>("/api/auth/admin-login/request-code/", {
        method: "POST",
        body: JSON.stringify({
          email: rawEmail.trim(),
          password: rawPassword,
        }),
      });

      if (!payload?.challenge_id) {
        throw new Error("Missing login challenge.");
      }

      setLoginStep("code");
      setLoginChallengeId(payload.challenge_id);
      setLoginMaskedEmail(payload.masked_email || rawEmail.trim());
      setLoginCodeExpiresIn(payload.expires_in_seconds || null);
      setPendingLoginEmail(rawEmail.trim());
      setPendingLoginPassword(rawPassword);
      setLoginCode("");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestAdminLoginCode(email, password);
  };

  const handleVerifyLoginCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCode = loginCode.trim();
    if (!normalizedCode) {
      setLoginError("Enter the email code.");
      return;
    }
    if (!loginChallengeId) {
      setLoginError("Missing login challenge. Request a new code.");
      return;
    }

    setLoginError("");
    setLoginBusy(true);
    try {
      const payload = await request<AdminLoginVerifyResponse>("/api/auth/admin-login/verify-code/", {
        method: "POST",
        body: JSON.stringify({
          challenge_id: loginChallengeId,
          code: normalizedCode,
        }),
      });

      if (!payload?.access || !payload?.user) {
        throw new Error("Invalid login response.");
      }

      setUserFromToken(payload.user, payload.access);
      setAdminAccessDenied(false);
      setError("");
      setLoginStep("credentials");
      setLoginChallengeId("");
      setLoginCode("");
      setLoginMaskedEmail("");
      setLoginCodeExpiresIn(null);
      setPendingLoginEmail("");
      setPendingLoginPassword("");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Code verification failed");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleResendLoginCode = async () => {
    if (!pendingLoginEmail || !pendingLoginPassword) {
      setLoginStep("credentials");
      setLoginError("Re-enter your credentials to request a new code.");
      return;
    }
    await requestAdminLoginCode(pendingLoginEmail, pendingLoginPassword);
  };

  const handleBackToCredentials = () => {
    setLoginStep("credentials");
    setLoginChallengeId("");
    setLoginCode("");
    setLoginMaskedEmail("");
    setLoginCodeExpiresIn(null);
    setLoginError("");
  };

  const cards = useMemo(
    () =>
      overview
        ? [
            ["Users", overview.totals.users_total],
            ["Active listings", overview.totals.listings_active],
            ["Needs moderation", overview.totals.listings_requires_moderation || 0],
            ["Views", overview.totals.views_total],
            ["Transactions", overview.totals.transactions_total],
            ["Paid amount", `${fmtMoney(overview.totals.transactions_amount_total)} EUR`],
            ["Site purchases", overview.totals.site_purchases_total || 0],
            ["Site spend", `${fmtMoney(overview.totals.site_purchases_amount_total || 0)} EUR`],
            ["Reports", overview.totals.reports_total],
            ["Contact inquiries", overview.totals.contact_inquiries_total || 0],
            ["New inquiries", overview.totals.contact_inquiries_new || 0],
          ]
        : [],
    [overview]
  );

  const runBusyAction = useCallback(async (id: number, action: () => Promise<void>, fallbackError: string) => {
    setBusyId(id);
    setError("");
    try {
      await action();
    } catch (err) {
      handleAdminRequestError(err, fallbackError);
    } finally {
      setBusyId(null);
    }
  }, [handleAdminRequestError]);

  const openReplyModal = useCallback((inquiry: AdminContactInquiry) => {
    setError("");
    setReplyModalInquiry(inquiry);
    setReplyModalSubject(
      inquiry.topic ? `Re: ${inquiry.topic}` : "Kar.bg support response"
    );
    setReplyModalMessage(inquiry.admin_reply || "");
  }, []);

  const closeReplyModal = useCallback(() => {
    if (replyModalInquiry && busyId === replyModalInquiry.id) return;
    setReplyModalInquiry(null);
    setReplyModalSubject("");
    setReplyModalMessage("");
  }, [replyModalInquiry, busyId]);

  const openDeleteModal = useCallback((listing: AdminListing) => {
    setError("");
    setDeleteModalListing(listing);
    setDeleteReason("fraud_suspicion");
    setDeleteCustomReason("");
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleteModalListing && busyId === deleteModalListing.id) return;
    setDeleteModalListing(null);
    setDeleteReason("fraud_suspicion");
    setDeleteCustomReason("");
  }, [deleteModalListing, busyId]);

  const confirmDeleteListing = useCallback(async () => {
    if (!deleteModalListing) return;
    if (deleteReason === "other" && deleteCustomReason.trim().length < 5) {
      setError("Custom reason must be at least 5 characters.");
      return;
    }

    await runBusyAction(
      deleteModalListing.id,
      async () => {
        const response = await request<{ email_sent?: boolean }>(
          `/api/admin/listings/${deleteModalListing.id}/delete/`,
          {
            method: "DELETE",
            body: JSON.stringify({
              reason: deleteReason,
              custom_reason: deleteReason === "other" ? deleteCustomReason.trim() : "",
            }),
          }
        );
        await Promise.all([loadListings(), loadOverview()]);
        if (response?.email_sent === false) {
          setError("Listing was deleted, but notification email was not sent.");
        }
        setDeleteModalListing(null);
        setDeleteReason("fraud_suspicion");
        setDeleteCustomReason("");
      },
      "Delete failed"
    );
  }, [
    deleteModalListing,
    deleteReason,
    deleteCustomReason,
    runBusyAction,
    loadListings,
    loadOverview,
  ]);

  const sendContactInquiryReply = useCallback(async () => {
    if (!replyModalInquiry) return;
    const trimmedReply = replyModalMessage.trim();
    if (!trimmedReply) {
      setError("Reply message is required.");
      return;
    }

    await runBusyAction(
      replyModalInquiry.id,
      async () => {
        await request(`/api/admin/contact-inquiries/${replyModalInquiry.id}/reply/`, {
          method: "POST",
          body: JSON.stringify({
            subject: replyModalSubject.trim(),
            reply_message: trimmedReply,
          }),
        });
        await Promise.all([loadContactInquiries(), loadOverview()]);
        setReplyModalInquiry(null);
        setReplyModalSubject("");
        setReplyModalMessage("");
      },
      "Reply failed"
    );
  }, [
    replyModalInquiry,
    replyModalMessage,
    replyModalSubject,
    runBusyAction,
    loadContactInquiries,
    loadOverview,
  ]);

  const applyListingPatch = useCallback(
    async (listingId: number, payload: Record<string, unknown>) => {
      const updated = await request<AdminListing>(`/api/admin/listings/${listingId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setListings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.map((row) => (row.id === updated.id ? updated : row)),
        };
      });

      const requestedType =
        typeof payload.listing_type === "string" ? payload.listing_type.trim().toLowerCase() : "";
      if (requestedType && updated.listing_type !== requestedType) {
        throw new Error(`Listing type mismatch: got "${updated.listing_type}", expected "${requestedType}".`);
      }

      await Promise.all([loadListings(), loadOverview()]);
    },
    [loadListings, loadOverview]
  );

  const statsPageSize = 5;
  const topListings = sitePurchases?.summary.top.listings || [];
  const topBuyers = sitePurchases?.summary.top.users || [];
  const planBreakdown = sitePurchases?.summary.breakdown.by_plan || [];
  const typeBreakdown = sitePurchases?.summary.breakdown.by_type || [];
  const sourceBreakdown = sitePurchases?.summary.breakdown.by_source || [];
  const dailySeries = sitePurchases?.summary.series.daily_last_30_days || [];
  const dailySeriesTotalCount = dailySeries.reduce((sum, item) => sum + item.count, 0);
  const dailySeriesTotalAmount = dailySeries.reduce((sum, item) => sum + item.amount, 0);
  const typeMaxCount = Math.max(1, ...typeBreakdown.map((item) => item.count));
  const sourceMaxCount = Math.max(1, ...sourceBreakdown.map((item) => item.count));

  const topListingsTotalPages = Math.max(1, Math.ceil(topListings.length / statsPageSize));
  const topBuyersTotalPages = Math.max(1, Math.ceil(topBuyers.length / statsPageSize));
  const plansTotalPages = Math.max(1, Math.ceil(planBreakdown.length / statsPageSize));

  const visibleTopListings = topListings.slice((topListingsPage - 1) * statsPageSize, topListingsPage * statsPageSize);
  const visibleTopBuyers = topBuyers.slice((topBuyersPage - 1) * statsPageSize, topBuyersPage * statsPageSize);
  const visiblePlans = planBreakdown.slice((plansPage - 1) * statsPageSize, plansPage * statsPageSize);

  const extensionTopUsers = extensionUsage?.summary.top.users || [];
  const extensionStatusBreakdown = extensionUsage?.summary.breakdown.by_status || [];
  const extensionSourceBreakdown = extensionUsage?.summary.breakdown.by_source || [];
  const extensionHostBreakdown = extensionUsage?.summary.breakdown.by_host || [];
  const extensionDailySeries = extensionUsage?.summary.series.daily_last_30_days || [];
  const extensionDailyTotal = extensionDailySeries.reduce((sum, item) => sum + item.count, 0);
  const extensionDailySuccess = extensionDailySeries.reduce((sum, item) => sum + item.success, 0);
  const extensionDailyFailed = extensionDailySeries.reduce((sum, item) => sum + item.failed, 0);
  const extensionStatusMaxCount = Math.max(1, ...extensionStatusBreakdown.map((item) => item.count));
  const extensionSourceMaxCount = Math.max(1, ...extensionSourceBreakdown.map((item) => item.count));
  const extensionTopUsersTotalPages = Math.max(1, Math.ceil(extensionTopUsers.length / statsPageSize));
  const extensionHostsTotalPages = Math.max(1, Math.ceil(extensionHostBreakdown.length / statsPageSize));
  const visibleExtensionTopUsers = extensionTopUsers.slice(
    (extensionTopUsersPage - 1) * statsPageSize,
    extensionTopUsersPage * statsPageSize
  );
  const visibleExtensionHosts = extensionHostBreakdown.slice(
    (extensionHostsPage - 1) * statsPageSize,
    extensionHostsPage * statsPageSize
  );

  if (isLoading) return <div style={{ padding: 24 }}>Loading session...</div>;

  if (shouldShowAdminLogin) {
    return (
      <section style={{ maxWidth: 430, margin: "40px auto", padding: 20, border: `1px solid ${color.border}`, borderRadius: 16, background: "#fff" }}>
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p style={{ color: color.muted }}>
          Use staff/superuser account. After password check you will receive a code by email.
        </p>
        {adminAccessDenied && (
          <div
            style={{
              border: "1px solid #f4c2c7",
              background: "#fff1f2",
              color: color.danger,
              borderRadius: 12,
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            Нямаш достъп до админ панела. Влез с админ акаунт.
          </div>
        )}

        {loginStep === "credentials" ? (
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={inputStyle} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required style={inputStyle} />
            {loginError && <div style={{ color: color.danger, fontSize: 13 }}>{loginError}</div>}
            <button disabled={loginBusy} type="submit" style={buttonStyle("primary")}>
              {loginBusy ? "Sending code..." : "Send login code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyLoginCode} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, color: color.muted }}>
              Code sent to <strong>{loginMaskedEmail || pendingLoginEmail || email}</strong>
              {loginCodeExpiresIn ? ` (valid for ${Math.round(loginCodeExpiresIn / 60)} min)` : ""}.
            </div>
            <input
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              style={inputStyle}
            />
            {loginError && <div style={{ color: color.danger, fontSize: 13 }}>{loginError}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button disabled={loginBusy} type="submit" style={buttonStyle("primary")}>
                {loginBusy ? "Verifying..." : "Verify and login"}
              </button>
              <button disabled={loginBusy} type="button" onClick={() => void handleResendLoginCode()} style={buttonStyle("neutral")}>
                Resend code
              </button>
              <button disabled={loginBusy} type="button" onClick={handleBackToCredentials} style={buttonStyle("neutral")}>
                Back
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${color.bg}, #e4edf6)`, padding: 16, fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif", color: color.text }}>
      <div style={{ maxWidth: 1420, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: color.muted }}>KAR.BG</div>
            <h2 style={{ margin: "6px 0", fontSize: 24 }}>Admin Control Panel</h2>
            <div style={{ fontSize: 13, color: color.muted }}>Manage listings, users, purchases, reports and contact inbox.</div>
            <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>Signed in as {user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => void loadByTab()} style={buttonStyle("neutral")}>Refresh tab</button>
            <button
              onClick={() => {
                void loadOverview().catch((err) => handleAdminRequestError(err, "Request failed"));
              }}
              style={buttonStyle("neutral")}
            >
              Refresh totals
            </button>
            <button onClick={() => void logout()} style={buttonStyle("danger")}>Logout</button>
          </div>
        </header>

        <nav style={{ ...panelStyle, display: "flex", gap: 8, flexWrap: "wrap", padding: 8 }}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{
                  minWidth: 145,
                  textAlign: "left",
                  borderRadius: 16,
                  padding: "8px 10px",
                  border: `1px solid ${active ? color.accent : color.borderStrong}`,
                  background: active ? color.accentSoft : "#fff",
                  color: active ? color.accent : color.text,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: color.muted }}>{item.hint}</div>
              </button>
            );
          })}
        </nav>

        {error && <div style={{ border: "1px solid #f4c2c7", background: "#fff1f2", color: color.danger, borderRadius: 16, padding: "10px 12px", fontSize: 13 }}>{error}</div>}

        {tab === "dashboard" && (
          <section style={panelStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
              {cards.map(([label, value]) => (
                <article key={String(label)} style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                  <div style={{ fontSize: 12, color: color.muted }}>{label}</div>
                  <strong style={{ fontSize: 22 }}>{String(value)}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "listings" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Listings</h3>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(listings?.pagination)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={listingQ} onChange={(e) => setListingQ(e.target.value)} placeholder="Search listings" style={inputStyle} />
              <select
                value={listingStatusFilter}
                onChange={(e) => setListingStatusFilter(e.target.value as "all" | "active" | "draft" | "archived" | "expired")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={listingTypeFilter}
                onChange={(e) => setListingTypeFilter(e.target.value as "" | "normal" | "top" | "vip")}
                style={{ ...inputStyle, minWidth: 120 }}
              >
                <option value="">All types</option>
                <option value="normal">Normal</option>
                <option value="top">Top</option>
                <option value="vip">VIP</option>
              </select>
              <select
                value={listingSellerTypeFilter}
                onChange={(e) => setListingSellerTypeFilter(e.target.value as "" | "private" | "business")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All sellers</option>
                <option value="private">Private</option>
                <option value="business">Business</option>
              </select>
              <select
                value={listingModerationFilter}
                onChange={(e) => setListingModerationFilter(e.target.value as "" | "review" | "clean")}
                style={{ ...inputStyle, minWidth: 150 }}
              >
                <option value="">All moderation</option>
                <option value="review">Needs review</option>
                <option value="clean">Clean</option>
              </select>
              <select
                value={listingSort}
                onChange={(e) =>
                  setListingSort(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "price_asc"
                      | "price_desc"
                      | "views_desc"
                      | "views_asc"
                      | "updated_desc"
                      | "updated_asc"
                      | "risk_desc"
                      | "risk_asc"
                  )
                }
                style={{ ...inputStyle, minWidth: 150 }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_desc">Price desc</option>
                <option value="price_asc">Price asc</option>
                <option value="views_desc">Views desc</option>
                <option value="views_asc">Views asc</option>
                <option value="updated_desc">Updated desc</option>
                <option value="updated_asc">Updated asc</option>
                <option value="risk_desc">Risk desc</option>
                <option value="risk_asc">Risk asc</option>
              </select>
              <button onClick={() => { setListingPage(1); void loadListings(); }} style={buttonStyle("primary")}>Search</button>
              <button
                onClick={() => {
                  setListingQ("");
                  setListingStatusFilter("all");
                  setListingTypeFilter("");
                  setListingSellerTypeFilter("");
                  setListingModerationFilter("");
                  setListingSort("newest");
                  setListingPage(1);
                }}
                style={buttonStyle("neutral")}
              >
                Reset
              </button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
                <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Listing</th><th style={thStyle}>Seller</th><th style={thStyle}>Price</th><th style={thStyle}>Status</th><th style={thStyle}>Moderation</th><th style={thStyle}>Views</th><th style={thStyle}>Actions</th></tr></thead>
                <tbody>
                  {(listings?.results || []).length === 0 ? (
                    <tr>
                      <td style={{ ...tdStyle, textAlign: "center", color: color.muted }} colSpan={8}>
                        No listings found for current filters.
                      </td>
                    </tr>
                  ) : (listings?.results || []).map((item) => {
                    const status = resolveListingStatus(item);
                    const promoExpiry = resolveListingPromoExpiry(item);
                    const isTop1d = item.listing_type === "top" && item.top_plan === "1d";
                    const isTop7d = item.listing_type === "top" && item.top_plan === "7d";
                    const isVip7d = item.listing_type === "vip" && item.vip_plan === "7d";
                    const isVipLifetime = item.listing_type === "vip" && item.vip_plan === "lifetime";
                    const moderationTone: Tone =
                      item.requires_moderation || item.risk_score >= 70
                        ? "danger"
                        : item.risk_score >= 35
                          ? "warning"
                          : "success";
                    const moderationLabel =
                      item.requires_moderation || item.risk_score >= 70
                        ? "Needs review"
                        : item.risk_score >= 35
                          ? "Watch"
                          : "Clean";
                    return (
                      <tr key={item.id}>
                        <td style={tdStyle}>#{item.id}</td>
                        <td style={tdStyle}>{item.brand} {item.model}<div style={{ fontSize: 12, color: color.muted }}>{item.title || "No title"} | {item.city}</div></td>
                        <td style={tdStyle}>{item.seller_name}<div style={{ fontSize: 12, color: color.muted }}>{item.user_email}</div></td>
                        <td style={tdStyle}>{fmtMoney(item.price)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span style={badgeStyle(status.tone)}>{status.label}</span>
                            <span style={badgeStyle(item.listing_type === "top" ? "info" : item.listing_type === "vip" ? "success" : "default")}>
                              {resolveListingTypeLabel(item)}
                            </span>
                          </div>
                          {promoExpiry && <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>{promoExpiry}</div>}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={badgeStyle(moderationTone)}>{moderationLabel}</span>
                            <span style={{ fontSize: 12, color: color.muted }}>Risk {item.risk_score || 0}/100</span>
                          </div>
                          {Array.isArray(item.risk_flags) && item.risk_flags.length > 0 && (
                            <div style={{ marginTop: 4, fontSize: 12, color: color.muted }}>
                              {item.risk_flags.join(", ")}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>{item.view_count}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { requires_moderation: !item.requires_moderation });
                                }, "Update failed");
                              }}
                              style={buttonStyle(item.requires_moderation ? "danger" : "neutral")}
                            >
                              {item.requires_moderation ? "Approve" : "Flag review"}
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, {
                                    is_archived: !item.is_archived,
                                    is_active: item.is_archived,
                                  });
                                }, "Update failed");
                              }}
                              style={buttonStyle("neutral")}
                            >
                              {item.is_archived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { listing_type: "top", top_plan: "1d" });
                                }, "Update failed");
                              }}
                              style={buttonStyle(isTop1d ? "primary" : "neutral")}
                            >
                              TOP 1d
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { listing_type: "top", top_plan: "7d" });
                                }, "Update failed");
                              }}
                              style={buttonStyle(isTop7d ? "primary" : "neutral")}
                            >
                              TOP 7d
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { listing_type: "vip", vip_plan: "7d" });
                                }, "Update failed");
                              }}
                              style={buttonStyle(isVip7d ? "primary" : "neutral")}
                            >
                              VIP 7d
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { listing_type: "vip", vip_plan: "lifetime" });
                                }, "Update failed");
                              }}
                              style={buttonStyle(isVipLifetime ? "primary" : "neutral")}
                            >
                              VIP lifetime
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await applyListingPatch(item.id, { listing_type: "normal" });
                                }, "Update failed");
                              }}
                              style={buttonStyle(item.listing_type === "normal" ? "primary" : "neutral")}
                            >
                              Normal
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={() => {
                                openDeleteModal(item);
                              }}
                              style={buttonStyle("danger")}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(listings?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!listings || listings.pagination.page <= 1} onClick={() => setListingPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                <button disabled={!listings || listings.pagination.page >= listings.pagination.total_pages} onClick={() => setListingPage((v) => v + 1)} style={buttonStyle("neutral")}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "users" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Users</h3>
              <span style={{ fontSize: 12, color: color.muted }}>
                {isSuperuser ? "Superuser: full rights" : "Admin: limited rights"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search users" style={inputStyle} />
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value as "" | "private" | "business")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All types</option>
                <option value="private">Private</option>
                <option value="business">Business</option>
              </select>
              <select
                value={userAdminFilter}
                onChange={(e) => setUserAdminFilter(e.target.value as "" | "true" | "false")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All roles</option>
                <option value="true">Only admin</option>
                <option value="false">Only users</option>
              </select>
              <select
                value={userActiveFilter}
                onChange={(e) => setUserActiveFilter(e.target.value as "" | "true" | "false")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All activity</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <select
                value={userSort}
                onChange={(e) =>
                  setUserSort(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "listings_desc"
                      | "listings_asc"
                      | "views_desc"
                      | "views_asc"
                      | "email_asc"
                      | "email_desc"
                  )
                }
                style={{ ...inputStyle, minWidth: 150 }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="listings_desc">Listings desc</option>
                <option value="listings_asc">Listings asc</option>
                <option value="views_desc">Views desc</option>
                <option value="views_asc">Views asc</option>
                <option value="email_asc">Email A-Z</option>
                <option value="email_desc">Email Z-A</option>
              </select>
              <button onClick={() => { setUserPage(1); void loadUsers(); }} style={buttonStyle("primary")}>Search</button>
              <button
                onClick={() => {
                  setUserQ("");
                  setUserTypeFilter("");
                  setUserAdminFilter("");
                  setUserActiveFilter("");
                  setUserSort("newest");
                  setUserPage(1);
                }}
                style={buttonStyle("neutral")}
              >
                Reset
              </button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
                <thead><tr><th style={thStyle}>User</th><th style={thStyle}>Type</th><th style={thStyle}>Balance</th><th style={thStyle}>Listings</th><th style={thStyle}>Views</th><th style={thStyle}>Role</th><th style={thStyle}>Actions</th></tr></thead>
                <tbody>
                  {(users?.results || []).map((item) => {
                    const role = roleBadge(item);
                    const self = item.id === currentUserId;
                    const canDelete = isSuperuser && !self;
                    return (
                      <tr key={item.id}>
                        <td style={tdStyle}>{userName(item)}<div style={{ fontSize: 12, color: color.muted }}>{item.email}</div><div style={{ fontSize: 12, color: color.muted }}>ID: {item.id}</div></td>
                        <td style={tdStyle}>{item.user_type}</td>
                        <td style={tdStyle}>{fmtMoney(item.balance)}</td>
                        <td style={tdStyle}>{item.listing_count}</td>
                        <td style={tdStyle}>{item.total_views}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span style={badgeStyle(role.tone)}>{role.label}</span>
                            <span style={badgeStyle(item.is_active ? "success" : "danger")}>{item.is_active ? "Active" : "Inactive"}</span>
                            {self && <span style={badgeStyle("info")}>Current user</span>}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Update failed");
                              }}
                              style={buttonStyle("neutral")}
                            >
                              {item.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              disabled={busyId === item.id || !isSuperuser}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_staff: !item.is_staff }) });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Update failed");
                              }}
                              title={isSuperuser ? "Toggle admin role" : "Only superusers can change admin role"}
                              style={buttonStyle("neutral")}
                            >
                              {item.is_staff ? "Remove admin" : "Make admin"}
                            </button>
                            <button
                              disabled={busyId === item.id || !isSuperuser}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ is_superuser: !item.is_superuser }),
                                  });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Update failed");
                              }}
                              title={isSuperuser ? "Toggle superuser role" : "Only superusers can change superuser role"}
                              style={buttonStyle("neutral")}
                            >
                              {item.is_superuser ? "Remove superuser" : "Make superuser"}
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                const value = window.prompt("Amount to add/subtract (example: 25 or -10):", "0");
                                if (value === null) return;
                                const normalizedValue = value.trim().replace(",", ".");
                                if (!normalizedValue) return;
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ balance_delta: normalizedValue }),
                                  });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Update failed");
                              }}
                              style={buttonStyle("neutral")}
                            >
                              Add balance
                            </button>
                            <button
                              disabled={busyId === item.id || !canDelete}
                              onClick={async () => {
                                if (!isSuperuser) {
                                  setError("Only superusers can delete users.");
                                  return;
                                }
                                if (self) {
                                  setError("You cannot delete your own account from the admin panel.");
                                  return;
                                }
                                if (!window.confirm(`Delete user ${userName(item)} (${item.email})?`)) return;
                                if (!window.confirm("This action is permanent and will remove related records. Continue?")) return;
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/delete/`, { method: "DELETE" });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Delete failed");
                              }}
                              title={canDelete ? "Delete user" : "Only superusers can delete other users"}
                              style={buttonStyle("danger")}
                            >
                              Delete user
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(users?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!users || users.pagination.page <= 1} onClick={() => setUserPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                <button disabled={!users || users.pagination.page >= users.pagination.total_pages} onClick={() => setUserPage((v) => v + 1)} style={buttonStyle("neutral")}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "transactions" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Transactions</h3>
              <span style={{ fontSize: 13, color: color.muted }}>
                {transactionsInnerTab === "topups"
                  ? pageLabel(transactions?.pagination)
                  : pageLabel(sitePurchases?.pagination)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                style={{
                  ...buttonStyle(transactionsInnerTab === "topups" ? "primary" : "neutral"),
                  minWidth: 140,
                }}
                onClick={() => setTransactionsInnerTab("topups")}
              >
                Balance top-ups
              </button>
              <button
                style={{
                  ...buttonStyle(transactionsInnerTab === "sitePurchases" ? "primary" : "neutral"),
                  minWidth: 140,
                }}
                onClick={() => setTransactionsInnerTab("sitePurchases")}
              >
                Site purchases
              </button>
            </div>

            {transactionsInnerTab === "topups" && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <input value={txQ} onChange={(e) => setTxQ(e.target.value)} placeholder="Search transactions" style={inputStyle} />
                  <select
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value as "" | "pending" | "succeeded" | "failed" | "cancelled")}
                    style={{ ...inputStyle, minWidth: 130 }}
                  >
                    <option value="">All status</option>
                    <option value="pending">Pending</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={txCreditedFilter}
                    onChange={(e) => setTxCreditedFilter(e.target.value as "" | "true" | "false")}
                    style={{ ...inputStyle, minWidth: 130 }}
                  >
                    <option value="">All credited</option>
                    <option value="true">Credited</option>
                    <option value="false">Not credited</option>
                  </select>
                  <select
                    value={txSort}
                    onChange={(e) => setTxSort(e.target.value as "newest" | "oldest" | "amount_desc" | "amount_asc")}
                    style={{ ...inputStyle, minWidth: 140 }}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="amount_desc">Amount desc</option>
                    <option value="amount_asc">Amount asc</option>
                  </select>
                  <button onClick={() => { setTxPage(1); void loadTransactions(); }} style={buttonStyle("primary")}>Search</button>
                  <button
                    onClick={() => {
                      setTxQ("");
                      setTxStatusFilter("");
                      setTxCreditedFilter("");
                      setTxSort("newest");
                      setTxPage(1);
                    }}
                    style={buttonStyle("neutral")}
                  >
                    Reset
                  </button>
                </div>
                <div style={tableWrap}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                    <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>User</th><th style={thStyle}>Amount</th><th style={thStyle}>Status</th><th style={thStyle}>Credited</th><th style={thStyle}>Created</th><th style={thStyle}>Session</th></tr></thead>
                    <tbody>
                      {(transactions?.results || []).map((item) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>#{item.id}</td>
                          <td style={tdStyle}>{item.user_email}</td>
                          <td style={tdStyle}>{fmtMoney(item.amount)} {item.currency}</td>
                          <td style={tdStyle}><span style={badgeStyle(txTone(item.status))}>{item.status}</span></td>
                          <td style={tdStyle}><span style={badgeStyle(item.credited ? "success" : "warning")}>{item.credited ? "Yes" : "No"}</span></td>
                          <td style={tdStyle}>{fmtDateTime(item.created_at)}</td>
                          <td style={tdStyle}>{item.stripe_session_id || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(transactions?.pagination)}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={!transactions || transactions.pagination.page <= 1} onClick={() => setTxPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                    <button disabled={!transactions || transactions.pagination.page >= transactions.pagination.total_pages} onClick={() => setTxPage((v) => v + 1)} style={buttonStyle("neutral")}>Next</button>
                  </div>
                </div>
              </>
            )}

            {transactionsInnerTab === "sitePurchases" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontSize: 12, color: color.muted }}>Total purchases</div>
                    <strong style={{ fontSize: 22 }}>{sitePurchases?.summary.totals.count || 0}</strong>
                  </article>
                  <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontSize: 12, color: color.muted }}>Total spend</div>
                    <strong style={{ fontSize: 22 }}>{fmtMoney(sitePurchases?.summary.totals.amount || 0)} EUR</strong>
                  </article>
                  <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontSize: 12, color: color.muted }}>Last 30d count</div>
                    <strong style={{ fontSize: 22 }}>{dailySeriesTotalCount}</strong>
                  </article>
                  <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontSize: 12, color: color.muted }}>Last 30d amount</div>
                    <strong style={{ fontSize: 22 }}>{fmtMoney(dailySeriesTotalAmount)} EUR</strong>
                  </article>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>By type</div>
                    {(typeBreakdown.length === 0) && <div style={{ fontSize: 13, color: color.muted }}>No data.</div>}
                    {typeBreakdown.map((row) => (
                      <div key={`type-${row.listing_type}`} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>{purchaseTypeLabel(row.listing_type || "")}</span>
                          <span>{row.count} | {fmtMoney(row.amount)} EUR</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
                          <div style={{ height: "100%", width: `${(row.count / typeMaxCount) * 100}%`, background: "#0d6dbb" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>By source</div>
                    {(sourceBreakdown.length === 0) && <div style={{ fontSize: 13, color: color.muted }}>No data.</div>}
                    {sourceBreakdown.map((row) => (
                      <div key={`source-${row.source}`} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>{purchaseSourceLabel(row.source || "")}</span>
                          <span>{row.count} | {fmtMoney(row.amount)} EUR</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
                          <div style={{ height: "100%", width: `${(row.count / sourceMaxCount) * 100}%`, background: "#0d6dbb" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>By plan</div>
                      <div style={{ fontSize: 12, color: color.muted }}>
                        Page {plansPage}/{plansTotalPages}
                      </div>
                    </div>
                    {(visiblePlans.length === 0) && <div style={{ fontSize: 13, color: color.muted }}>No data.</div>}
                    {visiblePlans.map((row, index) => (
                      <div key={`plan-${row.listing_type}-${row.plan}-${index}`} style={{ fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${color.border}` }}>
                        <strong>{purchaseTypeLabel(row.listing_type || "")}</strong> {String(row.plan || "-").toUpperCase()} | {row.count} | {fmtMoney(row.amount)} EUR
                      </div>
                    ))}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button disabled={plansPage <= 1} onClick={() => setPlansPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                      <button disabled={plansPage >= plansTotalPages} onClick={() => setPlansPage((v) => Math.min(plansTotalPages, v + 1))} style={buttonStyle("neutral")}>Next</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>Top bought listings</div>
                      <div style={{ fontSize: 12, color: color.muted }}>
                        Page {topListingsPage}/{topListingsTotalPages}
                      </div>
                    </div>
                    {visibleTopListings.length === 0 ? (
                      <div style={{ fontSize: 13, color: color.muted }}>No listing purchase data.</div>
                    ) : (
                      <div style={tableWrap}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Listing</th>
                              <th style={thStyle}>Count</th>
                              <th style={thStyle}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTopListings.map((row) => (
                              <tr key={`top-list-${row.listing_id}`}>
                                <td style={tdStyle}>
                                  {(row.brand || row.model) ? `${row.brand} ${row.model}`.trim() : row.title || `Listing #${row.listing_id}`}
                                  <div style={{ fontSize: 12, color: color.muted }}>#{row.listing_id}</div>
                                </td>
                                <td style={tdStyle}>{row.count}</td>
                                <td style={tdStyle}>{fmtMoney(row.amount)} EUR</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button disabled={topListingsPage <= 1} onClick={() => setTopListingsPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                      <button disabled={topListingsPage >= topListingsTotalPages} onClick={() => setTopListingsPage((v) => Math.min(topListingsTotalPages, v + 1))} style={buttonStyle("neutral")}>Next</button>
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>Top buyers</div>
                      <div style={{ fontSize: 12, color: color.muted }}>
                        Page {topBuyersPage}/{topBuyersTotalPages}
                      </div>
                    </div>
                    {visibleTopBuyers.length === 0 ? (
                      <div style={{ fontSize: 13, color: color.muted }}>No buyer data.</div>
                    ) : (
                      <div style={tableWrap}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>User</th>
                              <th style={thStyle}>Count</th>
                              <th style={thStyle}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTopBuyers.map((row) => (
                              <tr key={`top-user-${row.user_id}`}>
                                <td style={tdStyle}>
                                  {row.name}
                                  <div style={{ fontSize: 12, color: color.muted }}>{row.email}</div>
                                </td>
                                <td style={tdStyle}>{row.count}</td>
                                <td style={tdStyle}>{fmtMoney(row.amount)} EUR</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button disabled={topBuyersPage <= 1} onClick={() => setTopBuyersPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                      <button disabled={topBuyersPage >= topBuyersTotalPages} onClick={() => setTopBuyersPage((v) => Math.min(topBuyersTotalPages, v + 1))} style={buttonStyle("neutral")}>Next</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <input value={sitePurchaseQ} onChange={(e) => setSitePurchaseQ(e.target.value)} placeholder="Search site purchases" style={inputStyle} />
                  <select
                    value={sitePurchaseTypeFilter}
                    onChange={(e) => setSitePurchaseTypeFilter(e.target.value as "" | "top" | "vip")}
                    style={{ ...inputStyle, minWidth: 140 }}
                  >
                    <option value="">All types</option>
                    <option value="top">TOP</option>
                    <option value="vip">VIP</option>
                  </select>
                  <select
                    value={sitePurchaseSourceFilter}
                    onChange={(e) => setSitePurchaseSourceFilter(e.target.value as "" | "publish" | "republish" | "promote" | "unknown")}
                    style={{ ...inputStyle, minWidth: 160 }}
                  >
                    <option value="">All sources</option>
                    <option value="publish">Publish</option>
                    <option value="republish">Republish</option>
                    <option value="promote">Promote</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <button
                    onClick={() => {
                      setSitePurchasePage(1);
                      void loadSitePurchases();
                    }}
                    style={buttonStyle("primary")}
                  >
                    Search
                  </button>
                </div>
                <div style={tableWrap}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>ID</th>
                        <th style={thStyle}>User</th>
                        <th style={thStyle}>Listing</th>
                        <th style={thStyle}>Type/Plan</th>
                        <th style={thStyle}>Source</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>Discount</th>
                        <th style={thStyle}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sitePurchases?.results || []).map((item) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>#{item.id}</td>
                          <td style={tdStyle}>
                            {item.user_name}
                            <div style={{ fontSize: 12, color: color.muted }}>{item.user_email}</div>
                          </td>
                          <td style={tdStyle}>
                            {item.listing_id ? (
                              <>
                                {(item.listing_brand || item.listing_model)
                                  ? `${item.listing_brand} ${item.listing_model}`.trim()
                                  : item.listing_title || `Listing #${item.listing_id}`}
                                <div style={{ fontSize: 12, color: color.muted }}>
                                  #{item.listing_id}{item.listing_title ? ` | ${item.listing_title}` : ""}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: color.muted }}>No listing linked</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={badgeStyle(item.listing_type === "top" ? "info" : "success")}>
                                {purchaseTypeLabel(item.listing_type)}
                              </span>
                              <span style={badgeStyle("default")}>{String(item.plan || "-").toUpperCase()}</span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={badgeStyle(purchaseSourceTone(item.source))}>
                              {purchaseSourceLabel(item.source)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {fmtMoney(item.amount)} {item.currency}
                            {item.base_amount > item.amount && (
                              <div style={{ fontSize: 12, color: color.muted }}>
                                base: {fmtMoney(item.base_amount)} {item.currency}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {item.discount_ratio !== null && item.discount_ratio < 1
                              ? `${Math.round((1 - item.discount_ratio) * 100)}%`
                              : "-"}
                          </td>
                          <td style={tdStyle}>{fmtDateTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(sitePurchases?.pagination)}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      disabled={!sitePurchases || sitePurchases.pagination.page <= 1}
                      onClick={() => setSitePurchasePage((v) => Math.max(1, v - 1))}
                      style={buttonStyle("neutral")}
                    >
                      Prev
                    </button>
                    <button
                      disabled={!sitePurchases || sitePurchases.pagination.page >= sitePurchases.pagination.total_pages}
                      onClick={() => setSitePurchasePage((v) => v + 1)}
                      style={buttonStyle("neutral")}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {tab === "extensionApi" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Extension API usage</h3>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(extensionUsage?.pagination)}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Requests</div>
                <strong style={{ fontSize: 20 }}>{extensionUsage?.summary.totals.requests || 0}</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Success</div>
                <strong style={{ fontSize: 20 }}>{extensionUsage?.summary.totals.success || 0}</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Failed</div>
                <strong style={{ fontSize: 20 }}>{extensionUsage?.summary.totals.failed || 0}</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Success rate</div>
                <strong style={{ fontSize: 20 }}>{(extensionUsage?.summary.totals.success_rate ?? 0).toFixed(2)}%</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Users</div>
                <strong style={{ fontSize: 20 }}>{extensionUsage?.summary.totals.unique_users || 0}</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Imported listings</div>
                <strong style={{ fontSize: 20 }}>{extensionUsage?.summary.totals.imports || 0}</strong>
              </article>
              <article style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontSize: 12, color: color.muted }}>Avg duration</div>
                <strong style={{ fontSize: 20 }}>
                  {extensionUsage?.summary.totals.avg_duration_ms !== null && extensionUsage?.summary.totals.avg_duration_ms !== undefined
                    ? `${extensionUsage?.summary.totals.avg_duration_ms} ms`
                    : "-"}
                </strong>
              </article>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>By HTTP status</div>
                {extensionStatusBreakdown.length === 0 && <div style={{ fontSize: 13, color: color.muted }}>No data.</div>}
                {extensionStatusBreakdown.map((row) => (
                  <div key={`ext-status-${row.status_code}`} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{row.status_code || 0}</span>
                      <span>{row.count}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${(row.count / extensionStatusMaxCount) * 100}%`, background: "#0d6dbb" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>By source</div>
                {extensionSourceBreakdown.length === 0 && <div style={{ fontSize: 13, color: color.muted }}>No data.</div>}
                {extensionSourceBreakdown.map((row) => (
                  <div key={`ext-source-${row.source}`} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{extensionSourceLabel(row.source || "")}</span>
                      <span>{row.count}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${(row.count / extensionSourceMaxCount) * 100}%`, background: "#0d6dbb" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>30d totals</div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 13 }}>
                    Requests: <strong>{extensionDailyTotal}</strong>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Success: <strong>{extensionDailySuccess}</strong>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Failed: <strong>{extensionDailyFailed}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Top users by requests</div>
                  <div style={{ fontSize: 12, color: color.muted }}>
                    Page {extensionTopUsersPage}/{extensionTopUsersTotalPages}
                  </div>
                </div>
                {visibleExtensionTopUsers.length === 0 ? (
                  <div style={{ fontSize: 13, color: color.muted }}>No user usage data.</div>
                ) : (
                  <div style={tableWrap}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>User</th>
                          <th style={thStyle}>Req</th>
                          <th style={thStyle}>OK</th>
                          <th style={thStyle}>Fail</th>
                          <th style={thStyle}>Imports</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleExtensionTopUsers.map((row) => (
                          <tr key={`ext-top-user-${row.user_id}`}>
                            <td style={tdStyle}>
                              {row.name}
                              <div style={{ fontSize: 12, color: color.muted }}>{row.email}</div>
                            </td>
                            <td style={tdStyle}>{row.count}</td>
                            <td style={tdStyle}>{row.success}</td>
                            <td style={tdStyle}>{row.failed}</td>
                            <td style={tdStyle}>{row.imports}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button disabled={extensionTopUsersPage <= 1} onClick={() => setExtensionTopUsersPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                  <button disabled={extensionTopUsersPage >= extensionTopUsersTotalPages} onClick={() => setExtensionTopUsersPage((v) => Math.min(extensionTopUsersTotalPages, v + 1))} style={buttonStyle("neutral")}>Next</button>
                </div>
              </div>

              <div style={{ border: `1px solid ${color.border}`, borderRadius: 16, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Top source hosts</div>
                  <div style={{ fontSize: 12, color: color.muted }}>
                    Page {extensionHostsPage}/{extensionHostsTotalPages}
                  </div>
                </div>
                {visibleExtensionHosts.length === 0 ? (
                  <div style={{ fontSize: 13, color: color.muted }}>No host data.</div>
                ) : (
                  <div style={tableWrap}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Host</th>
                          <th style={thStyle}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleExtensionHosts.map((row, index) => (
                          <tr key={`ext-host-${row.source_host}-${index}`}>
                            <td style={tdStyle}>{row.source_host || "-"}</td>
                            <td style={tdStyle}>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button disabled={extensionHostsPage <= 1} onClick={() => setExtensionHostsPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                  <button disabled={extensionHostsPage >= extensionHostsTotalPages} onClick={() => setExtensionHostsPage((v) => Math.min(extensionHostsTotalPages, v + 1))} style={buttonStyle("neutral")}>Next</button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={extensionQ} onChange={(e) => setExtensionQ(e.target.value)} placeholder="Search usage logs" style={inputStyle} />
              <select
                value={extensionSuccessFilter}
                onChange={(e) => setExtensionSuccessFilter(e.target.value as "" | "true" | "false")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All results</option>
                <option value="true">Success only</option>
                <option value="false">Failed only</option>
              </select>
              <select
                value={extensionSourceFilter}
                onChange={(e) => setExtensionSourceFilter(e.target.value as "" | "extension" | "public_api" | "unknown")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All sources</option>
                <option value="extension">Extension</option>
                <option value="public_api">Public API</option>
                <option value="unknown">Unknown</option>
              </select>
              <select
                value={extensionHasImportFilter}
                onChange={(e) => setExtensionHasImportFilter(e.target.value as "" | "true" | "false")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="">All imports</option>
                <option value="true">Imported listing</option>
                <option value="false">No import</option>
              </select>
              <select
                value={extensionSort}
                onChange={(e) =>
                  setExtensionSort(
                    e.target.value as "newest" | "oldest" | "status_desc" | "status_asc" | "duration_desc" | "duration_asc"
                  )
                }
                style={{ ...inputStyle, minWidth: 150 }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="status_desc">Status desc</option>
                <option value="status_asc">Status asc</option>
                <option value="duration_desc">Duration desc</option>
                <option value="duration_asc">Duration asc</option>
              </select>
              <button
                onClick={() => {
                  setExtensionPage(1);
                  void loadExtensionUsage();
                }}
                style={buttonStyle("primary")}
              >
                Search
              </button>
              <button
                onClick={() => {
                  setExtensionQ("");
                  setExtensionSuccessFilter("");
                  setExtensionSourceFilter("");
                  setExtensionHasImportFilter("");
                  setExtensionSort("newest");
                  setExtensionPage(1);
                }}
                style={buttonStyle("neutral")}
              >
                Reset
              </button>
            </div>

            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1560 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID/Time</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Source</th>
                    <th style={thStyle}>Request</th>
                    <th style={thStyle}>Result</th>
                    <th style={thStyle}>Import</th>
                    <th style={thStyle}>Client</th>
                    <th style={thStyle}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(extensionUsage?.results || []).map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        #{item.id}
                        <div style={{ fontSize: 12, color: color.muted }}>{fmtDateTime(item.created_at)}</div>
                      </td>
                      <td style={tdStyle}>
                        {item.user_name || item.user_email || "Unknown"}
                        <div style={{ fontSize: 12, color: color.muted }}>
                          {item.user_email || "-"}{item.key_prefix ? ` | ${item.key_prefix}...` : ""}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(extensionSourceTone(item.source))}>
                          {extensionSourceLabel(item.source)}
                        </span>
                        <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>
                          {item.source_host || "-"}
                        </div>
                        {item.lot_number && (
                          <div style={{ fontSize: 12, color: color.muted }}>Lot: {item.lot_number}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={badgeStyle("default")}>{item.request_method}</span>
                        </div>
                        <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>{item.endpoint}</div>
                        <div style={{ fontSize: 12, color: color.muted }}>
                          payload: {item.payload_bytes ?? "-"} bytes
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(extensionStatusTone(item.status_code, item.success))}>
                          {item.status_code} {item.success ? "OK" : "FAIL"}
                        </span>
                        <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>
                          {item.duration_ms !== null && item.duration_ms !== undefined ? `${item.duration_ms} ms` : "-"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {item.imported_listing_id ? (
                          <>
                            #{item.imported_listing_id}
                            <div style={{ fontSize: 12, color: color.muted }}>
                              {item.imported_listing_title || item.imported_listing_slug || "-"}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: color.muted }}>No listing</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 12, color: color.muted }}>IP: {item.request_ip || "-"}</div>
                        <div style={{ fontSize: 12, color: color.muted }}>v: {item.extension_version || "-"}</div>
                        <div style={{ fontSize: 12, color: color.muted }}>
                          {item.user_agent
                            ? `${item.user_agent.slice(0, 84)}${item.user_agent.length > 84 ? "..." : ""}`
                            : "-"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {item.error_message
                          ? `${item.error_message.slice(0, 140)}${item.error_message.length > 140 ? "..." : ""}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(extensionUsage?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={!extensionUsage || extensionUsage.pagination.page <= 1}
                  onClick={() => setExtensionPage((v) => Math.max(1, v - 1))}
                  style={buttonStyle("neutral")}
                >
                  Prev
                </button>
                <button
                  disabled={!extensionUsage || extensionUsage.pagination.page >= extensionUsage.pagination.total_pages}
                  onClick={() => setExtensionPage((v) => v + 1)}
                  style={buttonStyle("neutral")}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Reports</h3>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(reports?.pagination)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={reportQ} onChange={(e) => setReportQ(e.target.value)} placeholder="Search reports" style={inputStyle} />
              <button onClick={() => { setReportPage(1); void loadReports(); }} style={buttonStyle("primary")}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Listing</th><th style={thStyle}>User</th><th style={thStyle}>Flags</th><th style={thStyle}>Message</th><th style={thStyle}>Created</th><th style={thStyle}>Action</th></tr></thead>
                <tbody>
                  {(reports?.results || []).map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>#{item.id}</td>
                      <td style={tdStyle}>{item.listing_brand} {item.listing_model} #{item.listing_id}</td>
                      <td style={tdStyle}>{item.user_email}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {item.incorrect_price && <span style={badgeStyle("warning")}>Incorrect price</span>}
                          {item.other_issue && <span style={badgeStyle("danger")}>Other issue</span>}
                          {!item.incorrect_price && !item.other_issue && <span style={badgeStyle("default")}>No flags</span>}
                        </div>
                      </td>
                      <td style={tdStyle}>{item.message || "-"}</td>
                      <td style={tdStyle}>{fmtDateTime(item.created_at)}</td>
                      <td style={tdStyle}>
                        <button
                          disabled={busyId === item.id}
                          onClick={async () => {
                            if (!window.confirm("Delete report?")) return;
                            await runBusyAction(item.id, async () => {
                              await request(`/api/admin/reports/${item.id}/delete/`, { method: "DELETE" });
                              await Promise.all([loadReports(), loadOverview()]);
                            }, "Delete failed");
                          }}
                          style={buttonStyle("danger")}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(reports?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!reports || reports.pagination.page <= 1} onClick={() => setReportPage((v) => Math.max(1, v - 1))} style={buttonStyle("neutral")}>Prev</button>
                <button disabled={!reports || reports.pagination.page >= reports.pagination.total_pages} onClick={() => setReportPage((v) => v + 1)} style={buttonStyle("neutral")}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "contactInquiries" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Contact inquiries</h3>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(contactInquiries?.pagination)}</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={badgeStyle("default")}>Total: {contactInquiries?.summary.total || 0}</span>
              <span style={badgeStyle("warning")}>New: {contactInquiries?.summary.new || 0}</span>
              <span style={badgeStyle("success")}>Replied: {contactInquiries?.summary.replied || 0}</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input
                value={contactInquiryQ}
                onChange={(e) => setContactInquiryQ(e.target.value)}
                placeholder="Search name, email, topic, message, customer reply"
                style={inputStyle}
              />
              <select
                value={contactInquiryStatusFilter}
                onChange={(e) => setContactInquiryStatusFilter(e.target.value as "" | "new" | "replied")}
                style={{ ...inputStyle, minWidth: 150 }}
              >
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="replied">Replied</option>
              </select>
              <select
                value={contactInquirySort}
                onChange={(e) => setContactInquirySort(e.target.value as "newest" | "oldest")}
                style={{ ...inputStyle, minWidth: 130 }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              <button
                onClick={() => {
                  setContactInquiryPage(1);
                  void loadContactInquiries();
                }}
                style={buttonStyle("primary")}
              >
                Search
              </button>
              <button
                onClick={() => {
                  setContactInquiryQ("");
                  setContactInquiryStatusFilter("");
                  setContactInquirySort("newest");
                  setContactInquiryPage(1);
                }}
                style={buttonStyle("neutral")}
              >
                Reset
              </button>
            </div>

            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Sender</th>
                    <th style={thStyle}>Topic</th>
                    <th style={thStyle}>Message</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Reply</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(contactInquiries?.results || []).map((item) => {
                    const status = resolveContactInquiryStatus(item);
                    return (
                      <tr key={item.id}>
                        <td style={tdStyle}>#{item.id}</td>
                        <td style={tdStyle}>
                          {item.name || "-"}
                          <div style={{ fontSize: 12, color: color.muted }}>{item.email || "-"}</div>
                        </td>
                        <td style={tdStyle}>{item.topic || "-"}</td>
                        <td style={tdStyle}>
                          <div>{item.message || "-"}</div>
                          {item.customer_reply ? (
                            <div style={{ marginTop: 8 }}>
                              <span style={badgeStyle("info")}>Latest customer reply</span>
                              <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{item.customer_reply}</div>
                              <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>
                                {item.customer_replied_at ? fmtDateTime(item.customer_replied_at) : "-"}
                              </div>
                            </div>
                          ) : null}
                        </td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(status.tone)}>{status.label}</span>
                        </td>
                        <td style={tdStyle}>
                          {item.admin_reply ? (
                            <>
                              {item.admin_reply}
                              <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>
                                {item.replied_by_email || "-"} | {item.replied_at ? fmtDateTime(item.replied_at) : "-"}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: color.muted }}>No reply yet</span>
                          )}
                        </td>
                        <td style={tdStyle}>{fmtDateTime(item.created_at)}</td>
                        <td style={tdStyle}>
                          <button
                            disabled={busyId === item.id}
                            onClick={() => openReplyModal(item)}
                            style={buttonStyle("primary")}
                          >
                            Reply by email
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(contactInquiries?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={!contactInquiries || contactInquiries.pagination.page <= 1}
                  onClick={() => setContactInquiryPage((v) => Math.max(1, v - 1))}
                  style={buttonStyle("neutral")}
                >
                  Prev
                </button>
                <button
                  disabled={!contactInquiries || contactInquiries.pagination.page >= contactInquiries.pagination.total_pages}
                  onClick={() => setContactInquiryPage((v) => v + 1)}
                  style={buttonStyle("neutral")}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {deleteModalListing && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 4200,
              background: "rgba(15, 23, 42, 0.5)",
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
            onClick={closeDeleteModal}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 640,
                background: "#fff",
                borderRadius: 16,
                border: `1px solid ${color.border}`,
                boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
                padding: 16,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Delete listing #{deleteModalListing.id}</h3>
                  <div style={{ fontSize: 13, color: color.muted, marginTop: 4 }}>
                    {deleteModalListing.brand} {deleteModalListing.model} | {deleteModalListing.user_email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={busyId === deleteModalListing.id}
                  style={buttonStyle("neutral")}
                >
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: color.muted }}>Delete reason (required)</span>
                  <select
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value as ListingDeleteReason)}
                    style={{ ...inputStyle, minWidth: 0, width: "100%" }}
                  >
                    {LISTING_DELETE_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {deleteReason === "other" && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: color.muted }}>Custom reason</span>
                    <textarea
                      value={deleteCustomReason}
                      onChange={(event) => setDeleteCustomReason(event.target.value)}
                      rows={4}
                      style={{
                        width: "100%",
                        borderRadius: 16,
                        border: `1px solid ${color.borderStrong}`,
                        padding: "12px 14px",
                        fontFamily: "inherit",
                        fontSize: 14,
                        resize: "vertical",
                      }}
                      placeholder="Write a clear reason for the seller (min 5 chars)."
                    />
                  </label>
                )}

                <div style={{ fontSize: 12, color: color.muted }}>
                  This action will delete the listing and notify the seller by in-app notification and email.
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={busyId === deleteModalListing.id}
                  style={buttonStyle("neutral")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteListing()}
                  disabled={busyId === deleteModalListing.id}
                  style={buttonStyle("danger")}
                >
                  {busyId === deleteModalListing.id ? "Deleting..." : "Delete and notify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {replyModalInquiry && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 4200,
              background: "rgba(15, 23, 42, 0.5)",
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
            onClick={closeReplyModal}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 760,
                background: "#fff",
                borderRadius: 16,
                border: `1px solid ${color.border}`,
                boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
                padding: 16,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Reply to inquiry #{replyModalInquiry.id}</h3>
                  <div style={{ fontSize: 13, color: color.muted, marginTop: 4 }}>
                    To: {replyModalInquiry.name || "-"} ({replyModalInquiry.email || "-"})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={busyId === replyModalInquiry.id}
                  style={buttonStyle("neutral")}
                >
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: color.muted }}>Subject</span>
                  <input
                    type="text"
                    value={replyModalSubject}
                    onChange={(event) => setReplyModalSubject(event.target.value)}
                    style={{ ...inputStyle, minWidth: 0, width: "100%" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: color.muted }}>Reply message</span>
                  <textarea
                    value={replyModalMessage}
                    onChange={(event) => setReplyModalMessage(event.target.value)}
                    rows={8}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      border: `1px solid ${color.borderStrong}`,
                      padding: "12px 14px",
                      fontFamily: "inherit",
                      fontSize: 14,
                      resize: "vertical",
                    }}
                    placeholder="Write a clear support reply..."
                  />
                </label>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={busyId === replyModalInquiry.id}
                  style={buttonStyle("neutral")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendContactInquiryReply()}
                  disabled={busyId === replyModalInquiry.id}
                  style={buttonStyle("primary")}
                >
                  {busyId === replyModalInquiry.id ? "Sending..." : "Send reply email"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
