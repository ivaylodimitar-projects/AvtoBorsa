import React from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MyAdsPage from "./MyAdsPage";
import { buildPublicProfilePath } from "../utils/profilePaths";

const normalizeSlug = (value: string) => value.trim().replace(/^\/+/, "").toLowerCase();

const ProfileRoutePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { publicProfileSlug } = useParams<{ publicProfileSlug: string }>();

  const ownSlug = normalizeSlug(buildPublicProfilePath(user));
  const currentSlug = normalizeSlug(publicProfileSlug || "");
  const isOwnProfileRoute = Boolean(isAuthenticated && user && ownSlug && ownSlug === currentSlug);

  if (isOwnProfileRoute) {
    return <MyAdsPage />;
  }

  return <MyAdsPage publicView publicProfileSlug={publicProfileSlug} />;
};

export default ProfileRoutePage;
