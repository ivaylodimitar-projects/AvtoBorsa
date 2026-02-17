import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "authToken";

type TabKey = "dashboard" | "listings" | "users" | "transactions" | "reports";
type Tone = "default" | "success" | "warning" | "danger" | "info";

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
    views_total: number;
    transactions_total: number;
    transactions_amount_total: number;
    reports_total: number;
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
  is_draft: boolean;
  is_archived: boolean;
  is_expired: boolean;
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

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "dashboard", label: "Dashboard", hint: "metrics" },
  { key: "listings", label: "Listings", hint: "ads" },
  { key: "users", label: "Users", hint: "accounts" },
  { key: "transactions", label: "Transactions", hint: "payments" },
  { key: "reports", label: "Reports", hint: "issues" },
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
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const data = payload as Record<string, unknown>;
    throw new Error(
      (typeof data.error === "string" && data.error) ||
        (typeof data.detail === "string" && data.detail) ||
        `Request failed (${response.status})`
    );
  }

  return payload as T;
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

const panelStyle: React.CSSProperties = {
  background: color.panel,
  border: `1px solid ${color.border}`,
  borderRadius: 12,
  padding: 14,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${color.border}`,
  borderRadius: 10,
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
  borderRadius: 8,
  border: `1px solid ${color.borderStrong}`,
  padding: "0 12px",
  minWidth: 260,
};

const buttonStyle = (variant: "primary" | "neutral" | "danger" = "neutral"): React.CSSProperties => {
  if (variant === "primary") {
    return {
      height: 34,
      padding: "0 12px",
      borderRadius: 8,
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
      borderRadius: 8,
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
    borderRadius: 8,
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

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, login, logout } = useAuth();

  const [tab, setTab] = useState<TabKey>("dashboard");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<Paged<AdminListing> | null>(null);
  const [users, setUsers] = useState<Paged<AdminUser> | null>(null);
  const [transactions, setTransactions] = useState<Paged<AdminTransaction> | null>(null);
  const [reports, setReports] = useState<Paged<AdminReport> | null>(null);

  const [listingQ, setListingQ] = useState("");
  const [userQ, setUserQ] = useState("");
  const [txQ, setTxQ] = useState("");
  const [reportQ, setReportQ] = useState("");

  const [listingPage, setListingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);

  const isAdmin = Boolean(
    user?.is_admin || user?.is_staff || user?.is_superuser || (user as { isAdmin?: boolean } | null)?.isAdmin
  );
  const isSuperuser = Boolean(user?.is_superuser);
  const currentUserId = user?.id || null;

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setOverview(await request<Overview>("/api/admin/overview/"));
  }, [isAdmin]);

  const loadListings = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(listingPage), page_size: "20" });
    if (listingQ.trim()) q.set("q", listingQ.trim());
    setListings(await request<Paged<AdminListing>>(`/api/admin/listings/?${q.toString()}`));
  }, [isAdmin, listingPage, listingQ]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(userPage), page_size: "20" });
    if (userQ.trim()) q.set("q", userQ.trim());
    setUsers(await request<Paged<AdminUser>>(`/api/admin/users/?${q.toString()}`));
  }, [isAdmin, userPage, userQ]);

  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(txPage), page_size: "20" });
    if (txQ.trim()) q.set("q", txQ.trim());
    setTransactions(await request<Paged<AdminTransaction>>(`/api/admin/transactions/?${q.toString()}`));
  }, [isAdmin, txPage, txQ]);

  const loadReports = useCallback(async () => {
    if (!isAdmin) return;
    const q = new URLSearchParams({ page: String(reportPage), page_size: "20" });
    if (reportQ.trim()) q.set("q", reportQ.trim());
    setReports(await request<Paged<AdminReport>>(`/api/admin/reports/?${q.toString()}`));
  }, [isAdmin, reportPage, reportQ]);

  const loadByTab = useCallback(async () => {
    try {
      setError("");
      if (tab === "dashboard") await loadOverview();
      if (tab === "listings") await loadListings();
      if (tab === "users") await loadUsers();
      if (tab === "transactions") await loadTransactions();
      if (tab === "reports") await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }, [tab, loadOverview, loadListings, loadUsers, loadTransactions, loadReports]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadOverview();
  }, [isAdmin, loadOverview]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadByTab();
  }, [isAdmin, loadByTab]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      await login(email.trim(), password);
      const me = await request<Record<string, unknown>>("/api/auth/me/");
      if (!(me.is_admin || me.is_staff || me.is_superuser || me.isAdmin)) {
        await logout();
        setLoginError("This account has no admin role.");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  };

  const cards = useMemo(
    () =>
      overview
        ? [
            ["Users", overview.totals.users_total],
            ["Active listings", overview.totals.listings_active],
            ["Views", overview.totals.views_total],
            ["Transactions", overview.totals.transactions_total],
            ["Paid amount", `${fmtMoney(overview.totals.transactions_amount_total)} EUR`],
            ["Reports", overview.totals.reports_total],
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
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      setBusyId(null);
    }
  }, []);

  if (isLoading) return <div style={{ padding: 24 }}>Loading session...</div>;

  if (!user) {
    return (
      <section style={{ maxWidth: 430, margin: "40px auto", padding: 20, border: `1px solid ${color.border}`, borderRadius: 12, background: "#fff" }}>
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p style={{ color: color.muted }}>Use staff/superuser account.</p>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={inputStyle} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required style={inputStyle} />
          {loginError && <div style={{ color: color.danger, fontSize: 13 }}>{loginError}</div>}
          <button disabled={loginBusy} type="submit" style={buttonStyle("primary")}>{loginBusy ? "Signing..." : "Login /admin"}</button>
        </form>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section style={{ maxWidth: 520, margin: "40px auto", padding: 20, border: `1px solid ${color.border}`, borderRadius: 12, background: "#fff" }}>
        <h1 style={{ marginTop: 0 }}>Admin role required</h1>
        <p style={{ color: color.muted }}>Your account is authenticated but has no admin rights.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/")} style={buttonStyle("neutral")}>Back</button>
          <button onClick={() => void logout()} style={buttonStyle("danger")}>Logout</button>
        </div>
      </section>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${color.bg}, #e4edf6)`, padding: 16, fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif", color: color.text }}>
      <div style={{ maxWidth: 1420, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: color.muted }}>AVTOBORSA</div>
            <h2 style={{ margin: "6px 0", fontSize: 24 }}>Admin Control Panel</h2>
            <div style={{ fontSize: 13, color: color.muted }}>Manage listings, users, purchases and reports.</div>
            <div style={{ fontSize: 12, color: color.muted, marginTop: 4 }}>Signed in as {user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => void loadByTab()} style={buttonStyle("neutral")}>Refresh tab</button>
            <button onClick={() => void loadOverview()} style={buttonStyle("neutral")}>Refresh totals</button>
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
                  borderRadius: 10,
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

        {error && <div style={{ border: "1px solid #f4c2c7", background: "#fff1f2", color: color.danger, borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>{error}</div>}

        {tab === "dashboard" && (
          <section style={panelStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
              {cards.map(([label, value]) => (
                <article key={String(label)} style={{ border: `1px solid ${color.border}`, borderRadius: 10, padding: 10 }}>
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
              <button onClick={() => { setListingPage(1); void loadListings(); }} style={buttonStyle("primary")}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
                <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Listing</th><th style={thStyle}>Seller</th><th style={thStyle}>Price</th><th style={thStyle}>Status</th><th style={thStyle}>Views</th><th style={thStyle}>Actions</th></tr></thead>
                <tbody>
                  {(listings?.results || []).map((item) => {
                    const status = resolveListingStatus(item);
                    return (
                      <tr key={item.id}>
                        <td style={tdStyle}>#{item.id}</td>
                        <td style={tdStyle}>{item.brand} {item.model}<div style={{ fontSize: 12, color: color.muted }}>{item.title || "No title"} | {item.city}</div></td>
                        <td style={tdStyle}>{item.seller_name}<div style={{ fontSize: 12, color: color.muted }}>{item.user_email}</div></td>
                        <td style={tdStyle}>{fmtMoney(item.price)}</td>
                        <td style={tdStyle}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={badgeStyle(status.tone)}>{status.label}</span><span style={badgeStyle("default")}>{item.listing_type}</span></div></td>
                        <td style={tdStyle}>{item.view_count}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/listings/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_archived: !item.is_archived, is_active: item.is_archived }) });
                                  await Promise.all([loadListings(), loadOverview()]);
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
                                  await request(`/api/admin/listings/${item.id}/`, { method: "PATCH", body: JSON.stringify({ listing_type: "normal" }) });
                                  await Promise.all([loadListings(), loadOverview()]);
                                }, "Update failed");
                              }}
                              style={buttonStyle("neutral")}
                            >
                              Normal
                            </button>
                            <button
                              disabled={busyId === item.id}
                              onClick={async () => {
                                if (!window.confirm("Delete listing?")) return;
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/listings/${item.id}/delete/`, { method: "DELETE" });
                                  await Promise.all([loadListings(), loadOverview()]);
                                }, "Delete failed");
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
              <button onClick={() => { setUserPage(1); void loadUsers(); }} style={buttonStyle("primary")}>Search</button>
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
                              disabled={busyId === item.id}
                              onClick={async () => {
                                const value = window.prompt("New balance:", item.balance.toFixed(2));
                                if (value === null) return;
                                await runBusyAction(item.id, async () => {
                                  await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ balance: value }) });
                                  await Promise.all([loadUsers(), loadOverview()]);
                                }, "Update failed");
                              }}
                              style={buttonStyle("neutral")}
                            >
                              Set balance
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
              <span style={{ fontSize: 13, color: color.muted }}>{pageLabel(transactions?.pagination)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={txQ} onChange={(e) => setTxQ(e.target.value)} placeholder="Search transactions" style={inputStyle} />
              <button onClick={() => { setTxPage(1); void loadTransactions(); }} style={buttonStyle("primary")}>Search</button>
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
      </div>
    </div>
  );
};

export default AdminPage;
