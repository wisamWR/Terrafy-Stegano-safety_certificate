import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const sessionCookie = request.cookies.get("user_session");
    const isUserLoggedIn = !!sessionCookie;

    // Helper to get session data
    let userRole = null;
    try {
        if (sessionCookie) {
            const session = JSON.parse(sessionCookie.value);
            userRole = session.role;
        }
    } catch (e) { }

    // --- PUBLIC PATHS ---
    const isPublicPath =
        path === "/login" ||
        path === "/register" ||
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
