import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Signature + expiry are checked, so a hand-edited cookie is treated as logged out.
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    const isUserLoggedIn = !!session;
    const userRole = session?.role ?? null;

    // --- PUBLIC PATHS ---
    const isPublicPath =
        path === "/login" ||
        path === "/register" ||
        path === "/verifikasi" ||
        path === "/admin/login" ||
        path.startsWith("/api") ||
        path.startsWith("/_next") ||
        path.includes(".");

    // --- ADMIN PROTECTION ---
    if (path.startsWith("/admin")) {
        if (path === "/admin/login") {
            if (isUserLoggedIn && userRole === "ADMIN") {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            }
            return NextResponse.next();
        }

        if (!isUserLoggedIn || userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }
    }

    // --- USER PROTECTION ---
    if (!isUserLoggedIn && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect to dashboard/home if logged in and trying to access auth pages
    if (isUserLoggedIn && (path === "/login" || path === "/register" || path === "/admin/login")) {
        if (userRole === "ADMIN" && path.startsWith("/admin")) {
            return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
