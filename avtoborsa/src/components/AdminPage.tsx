import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);
const ACCESS_TOKEN_KEY = "authToken";

type TabKey = "dashboard" | "listings" | "users" | "transactions" | "reports";

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

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "listings", label: "Listings" },
  { key: "users", label: "Users" },
  { key: "transactions", label: "Transactions" },
  { key: "reports", label: "Reports" },
];

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
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  const payload = await parseJson(response);
  if (!response.ok) {
    const value = payload as Record<string, unknown>;
    throw new Error(
      (typeof value.error === "string" && value.error) ||
        (typeof value.detail === "string" && value.detail) ||
        `Request failed (${response.status})`
    );
  }
  return payload as T;
};

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const pageLabel = (pagination: Pagination | null | undefined) => {
  if (!pagination || pagination.total === 0) return "0 results";
  const start = (pagination.page - 1) * pagination.page_size + 1;
  const end = Math.min(pagination.page * pagination.page_size, pagination.total);
  return `${start}-${end} of ${pagination.total}`;
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

  const rowStyle: React.CSSProperties = { borderBottom: "1px solid #d9e2ec" };
  const tableWrap: React.CSSProperties = { overflowX: "auto", border: "1px solid #d9e2ec", borderRadius: 10 };

  if (isLoading) return <div style={{ padding: 24 }}>Loading session...</div>;

  if (!user) {
    return (
      <section style={{ maxWidth: 420, margin: "40px auto", padding: 20, border: "1px solid #d9e2ec", borderRadius: 12, background: "#fff" }}>
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p>Use staff/superuser account.</p>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
          {loginError && <div style={{ color: "#b91c1c", fontSize: 13 }}>{loginError}</div>}
          <button disabled={loginBusy} type="submit">{loginBusy ? "Signing..." : "Login /admin"}</button>
        </form>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section style={{ maxWidth: 520, margin: "40px auto", padding: 20, border: "1px solid #d9e2ec", borderRadius: 12, background: "#fff" }}>
        <h1 style={{ marginTop: 0 }}>Admin role required</h1>
        <p>Your account is authenticated but has no admin rights.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/")}>Back</button>
          <button onClick={() => void logout()}>Logout</button>
        </div>
      </section>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#eef5fb,#f8fafc)", padding: 16, fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <strong>AvtoBorsa Admin</strong>
            <h2 style={{ margin: "8px 0 4px" }}>Control Panel</h2>
            <span style={{ color: "#4b5563", fontSize: 13 }}>Manage listings, users, purchases and reports.</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => void loadByTab()}>Refresh</button>
            <button onClick={() => void logout()}>Logout</button>
          </div>
        </header>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                background: tab === item.key ? "#0f766e" : "#fff",
                color: tab === item.key ? "#fff" : "#1f2937",
                border: "1px solid #cbd5e1",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}

        {tab === "dashboard" && (
          <section style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
              {cards.map(([label, value]) => (
                <article key={String(label)} style={{ border: "1px solid #d9e2ec", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
                  <strong style={{ fontSize: 20 }}>{String(value)}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "listings" && (
          <section style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={listingQ} onChange={(e) => setListingQ(e.target.value)} placeholder="Search listings" />
              <button onClick={() => { setListingPage(1); void loadListings(); }}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead><tr><th>ID</th><th>Listing</th><th>Seller</th><th>Price</th><th>Status</th><th>Views</th><th>Actions</th></tr></thead>
                <tbody>
                  {(listings?.results || []).map((item) => (
                    <tr key={item.id} style={rowStyle}>
                      <td>{item.id}</td>
                      <td>{item.brand} {item.model}<div style={{ fontSize: 12, color: "#64748b" }}>{item.title || "No title"} | {item.city}</div></td>
                      <td>{item.seller_name}<div style={{ fontSize: 12, color: "#64748b" }}>{item.user_email}</div></td>
                      <td>{fmtMoney(item.price)}</td>
                      <td>{item.is_draft ? "draft" : item.is_archived ? "archived" : item.is_expired ? "expired" : "active"} ({item.listing_type})</td>
                      <td>{item.view_count}</td>
                      <td style={{ display: "grid", gap: 6 }}>
                        <button disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await request(`/api/admin/listings/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_archived: !item.is_archived, is_active: item.is_archived }) }); await loadListings(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setBusyId(null); } }}>{item.is_archived ? "Unarchive" : "Archive"}</button>
                        <button disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await request(`/api/admin/listings/${item.id}/`, { method: "PATCH", body: JSON.stringify({ listing_type: "normal" }) }); await loadListings(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setBusyId(null); } }}>Normal</button>
                        <button disabled={busyId === item.id} onClick={async () => { if (!window.confirm("Delete listing?")) return; setBusyId(item.id); try { await request(`/api/admin/listings/${item.id}/delete/`, { method: "DELETE" }); await loadListings(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); } finally { setBusyId(null); } }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{pageLabel(listings?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!listings || listings.pagination.page <= 1} onClick={() => setListingPage((value) => Math.max(1, value - 1))}>Prev</button>
                <button disabled={!listings || listings.pagination.page >= listings.pagination.total_pages} onClick={() => setListingPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "users" && (
          <section style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search users" />
              <button onClick={() => { setUserPage(1); void loadUsers(); }}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead><tr><th>User</th><th>Type</th><th>Balance</th><th>Listings</th><th>Views</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {(users?.results || []).map((item) => (
                    <tr key={item.id} style={rowStyle}>
                      <td>{item.first_name || item.last_name ? `${item.first_name} ${item.last_name}`.trim() : item.username}<div style={{ fontSize: 12, color: "#64748b" }}>{item.email}</div></td>
                      <td>{item.user_type}</td>
                      <td>{fmtMoney(item.balance)}</td>
                      <td>{item.listing_count}</td>
                      <td>{item.total_views}</td>
                      <td>{item.is_superuser ? "superuser" : item.is_staff ? "admin" : "user"} | {item.is_active ? "active" : "inactive"}</td>
                      <td style={{ display: "grid", gap: 6 }}>
                        <button disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await loadUsers(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setBusyId(null); } }}>{item.is_active ? "Deactivate" : "Activate"}</button>
                        <button disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_staff: !item.is_staff }) }); await loadUsers(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setBusyId(null); } }}>{item.is_staff ? "Remove admin" : "Make admin"}</button>
                        <button disabled={busyId === item.id} onClick={async () => { const value = window.prompt("New balance:", item.balance.toFixed(2)); if (value === null) return; setBusyId(item.id); try { await request(`/api/admin/users/${item.id}/`, { method: "PATCH", body: JSON.stringify({ balance: value }) }); await loadUsers(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setBusyId(null); } }}>Set balance</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{pageLabel(users?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!users || users.pagination.page <= 1} onClick={() => setUserPage((value) => Math.max(1, value - 1))}>Prev</button>
                <button disabled={!users || users.pagination.page >= users.pagination.total_pages} onClick={() => setUserPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "transactions" && (
          <section style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={txQ} onChange={(e) => setTxQ(e.target.value)} placeholder="Search transactions" />
              <button onClick={() => { setTxPage(1); void loadTransactions(); }}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Status</th><th>Credited</th><th>Created</th><th>Session</th></tr></thead>
                <tbody>
                  {(transactions?.results || []).map((item) => (
                    <tr key={item.id} style={rowStyle}>
                      <td>{item.id}</td><td>{item.user_email}</td><td>{fmtMoney(item.amount)} {item.currency}</td><td>{item.status}</td><td>{item.credited ? "yes" : "no"}</td><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.stripe_session_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{pageLabel(transactions?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!transactions || transactions.pagination.page <= 1} onClick={() => setTxPage((value) => Math.max(1, value - 1))}>Prev</button>
                <button disabled={!transactions || transactions.pagination.page >= transactions.pagination.total_pages} onClick={() => setTxPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section style={{ background: "#fff", border: "1px solid #d9e2ec", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={reportQ} onChange={(e) => setReportQ(e.target.value)} placeholder="Search reports" />
              <button onClick={() => { setReportPage(1); void loadReports(); }}>Search</button>
            </div>
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
                <thead><tr><th>ID</th><th>Listing</th><th>User</th><th>Flags</th><th>Message</th><th>Created</th><th>Action</th></tr></thead>
                <tbody>
                  {(reports?.results || []).map((item) => (
                    <tr key={item.id} style={rowStyle}>
                      <td>{item.id}</td><td>{item.listing_brand} {item.listing_model} #{item.listing_id}</td><td>{item.user_email}</td><td>{item.incorrect_price ? "price " : ""}{item.other_issue ? "other" : ""}</td><td>{item.message || "-"}</td><td>{new Date(item.created_at).toLocaleString()}</td>
                      <td><button disabled={busyId === item.id} onClick={async () => { if (!window.confirm("Delete report?")) return; setBusyId(item.id); try { await request(`/api/admin/reports/${item.id}/delete/`, { method: "DELETE" }); await loadReports(); await loadOverview(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); } finally { setBusyId(null); } }}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{pageLabel(reports?.pagination)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!reports || reports.pagination.page <= 1} onClick={() => setReportPage((value) => Math.max(1, value - 1))}>Prev</button>
                <button disabled={!reports || reports.pagination.page >= reports.pagination.total_pages} onClick={() => setReportPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
