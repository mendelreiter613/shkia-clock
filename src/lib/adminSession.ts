import "server-only";

// The admin session token lives only in this httpOnly cookie; Supabase keeps
// a hash of it (public.shkia_admin_sessions) for 30 days.
export const ADMIN_COOKIE = "shkia_admin";
export const ADMIN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export const adminCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
};
