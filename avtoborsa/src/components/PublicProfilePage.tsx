import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Fuel, Gauge } from "lucide-react";
import ResponsiveImage, { type ApiPhoto } from "./ResponsiveImage";
import { API_BASE_URL } from "../config/api";
import { getMainCategoryLabel } from "../constants/mobileBgData";

type PublicListing = {
  id: number;
  slug: string;
  main_category?: string;
  brand?: string;
  model?: string;
  year_from?: number;
  price?: number;
  city?: string;
  fuel_display?: string;
  mileage?: number;
  listing_type?: string;
  listing_type_display?: string;
  image_url?: string | null;
  photo?: ApiPhoto | null;
  images?: ApiPhoto[];
  created_at?: string;
};

type PublicProfilePayload = {
  profile?: {
    type?: "private" | "business";
    slug?: string;
    title?: string;
    city?: string;
    profile_image_url?: string | null;
  };
  listings?: PublicListing[];
  listing_count?: number;
  is_owner?: boolean;
};

const PublicProfilePage: React.FC = () => {
  const { publicProfileSlug } = useParams<{ publicProfileSlug: string }>();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [listingFilter, setListingFilter] = useState<"all" | "top" | "vip">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");

  useEffect(() => {
    const fetchPublicProfile = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/profiles/${encodeURIComponent(publicProfileSlug || "")}/`,
          { cache: "no-store" }
        );

        if (response.status === 404) {
          setNotFound(true);
          setPayload(null);
          return;
        }

        if (!response.ok) {
          setNotFound(true);
          setPayload(null);
          return;
        }

        const data = (await response.json()) as PublicProfilePayload;
        setPayload(data);
      } catch {
        setNotFound(true);
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [publicProfileSlug]);

  const listings = useMemo(() => payload?.listings || [], [payload?.listings]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .map((item) => String(item.main_category || "").trim())
            .filter((item) => item.length > 0)
        )
      ),
    [listings]
  );

  const filteredByTab = useMemo(() => {
    if (listingFilter === "all") return listings;
    return listings.filter((item) => (item.listing_type || "").toLowerCase() === listingFilter);
  }, [listingFilter, listings]);

  const filteredByCategory = useMemo(() => {
    if (categoryFilter === "all") return filteredByTab;
    return filteredByTab.filter((item) => String(item.main_category || "") === categoryFilter);
  }, [categoryFilter, filteredByTab]);

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredByCategory
            .map((item) => String(item.brand || "").trim())
            .filter((item) => item.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "bg", { sensitivity: "base" })),
    [filteredByCategory]
  );

  const filteredByBrand = useMemo(() => {
    if (brandFilter === "all") return filteredByCategory;
    return filteredByCategory.filter((item) => String(item.brand || "").trim() === brandFilter);
  }, [brandFilter, filteredByCategory]);

  const modelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredByBrand
            .map((item) => String(item.model || "").trim())
            .filter((item) => item.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "bg", { sensitivity: "base" })),
    [filteredByBrand]
  );

  const visibleListings = useMemo(() => {
    if (modelFilter === "all") return filteredByBrand;
    return filteredByBrand.filter((item) => String(item.model || "").trim() === modelFilter);
  }, [filteredByBrand, modelFilter]);

  useEffect(() => {
    setBrandFilter("all");
    setModelFilter("all");
  }, [categoryFilter, listingFilter]);
  const profileTitle = payload?.profile?.title || "Профил";

  if (loading) {
    return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>Зареждане...</div>;
  }

  if (notFound || !payload) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px" }}>Профилът не е намерен</h2>
          <button
            onClick={() => navigate("/")}
            style={{ border: "1px solid #0f766e", background: "#0f766e", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer" }}
          >
            Към началото
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "16px 14px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
          {payload.profile?.profile_image_url ? (
            <img src={payload.profile.profile_image_url} alt={profileTitle} style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#0f766e", color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700 }}>
              {profileTitle.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>{`Обяви на ${profileTitle}`}</h1>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {payload.profile?.city ? <span>{payload.profile.city}</span> : null}
              <span>{payload.listing_count || listings.length} активни обяви</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              onClick={() => setListingFilter("all")}
              style={{
                border: listingFilter === "all" ? "1px solid #0f766e" : "1px solid #cbd5e1",
                background: listingFilter === "all" ? "#0f766e" : "#fff",
                color: listingFilter === "all" ? "#fff" : "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Обяви
            </button>
            <button
              onClick={() => setListingFilter("top")}
              style={{
                border: listingFilter === "top" ? "1px solid #0f766e" : "1px solid #cbd5e1",
                background: listingFilter === "top" ? "#0f766e" : "#fff",
                color: listingFilter === "top" ? "#fff" : "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              TOP обяви
            </button>
            <button
              onClick={() => setListingFilter("vip")}
              style={{
                border: listingFilter === "vip" ? "1px solid #0f766e" : "1px solid #cbd5e1",
                background: listingFilter === "vip" ? "#0f766e" : "#fff",
                color: listingFilter === "vip" ? "#fff" : "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              VIP обяви
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 14 }}
            >
              <option value="all">Категории</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {getMainCategoryLabel(option)}
                </option>
              ))}
            </select>
            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 14 }}
            >
              <option value="all">Марки</option>
              {brandOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 14 }}
            >
              <option value="all">Модели</option>
              {modelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visibleListings.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, color: "#475569" }}>
            Няма активни обяви.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {visibleListings.map((listing) => (
              <article
                key={listing.id}
                onClick={() => navigate(`/details/${listing.slug}`)}
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, cursor: "pointer" }}
              >
                <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden", background: "#e2e8f0" }}>
                  <ResponsiveImage
                    photo={listing.photo || null}
                    fallbackPath={listing.image_url || null}
                    alt={`${listing.brand || ""} ${listing.model || ""}`.trim()}
                    kind="grid"
                    loading="lazy"
                    decoding="async"
                    width={360}
                    sizes="(max-width: 768px) 100vw, 240px"
                    imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>
                    {[listing.brand, listing.model, listing.year_from].filter(Boolean).join(" ")}
                  </h2>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#0f766e" }}>
                    {Number(listing.price || 0).toLocaleString("bg-BG")} EUR
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", color: "#475569", fontSize: 14 }}>
                    {listing.city ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={14} />{listing.city}</span> : null}
                    {listing.fuel_display ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Fuel size={14} />{listing.fuel_display}</span> : null}
                    {listing.mileage ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Gauge size={14} />{Number(listing.mileage).toLocaleString("bg-BG")} км</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
