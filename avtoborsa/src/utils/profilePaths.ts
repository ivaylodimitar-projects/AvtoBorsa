type AuthUserLike = {
  userType?: "private" | "business";
  username?: string;
  dealer_name?: string;
  public_profile_path?: string;
};

const slugifySegment = (value: string): string => {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s._-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "profile";
};

export const buildPublicProfilePath = (user: AuthUserLike | null | undefined): string => {
  if (!user) return "/my-ads";
  if (typeof user.public_profile_path === "string" && user.public_profile_path.trim()) {
    return user.public_profile_path.trim().startsWith("/")
      ? user.public_profile_path.trim()
      : `/${user.public_profile_path.trim()}`;
  }

  if (user.userType === "business") {
    const dealerName = (user.dealer_name || "").trim();
    if (dealerName) return `/${slugifySegment(dealerName)}`;
  }

  const username = (user.username || "").trim();
  if (username) return `/${slugifySegment(username)}`;

  return "/my-ads";
};
