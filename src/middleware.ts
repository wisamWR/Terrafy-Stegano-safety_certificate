import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // --- ADMIN PROTECTION ---
    if (path.startsWith("/admin")) {
        const isAdminLoggedIn = request.cookies.get("admin_session");

        if (path === "/admin") {
            if (isAdminLoggedIn) {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            } else {
                return NextResponse.redirect(new URL("/admin/login", request.url));
            }
        }

        if (path !== "/admin/login" && !isAdminLoggedIn) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        if (path === "/admin/login" && isAdminLoggedIn) {
            return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }

        return NextResponse.next();
    }

    // --- USER PROTECTION (Mandatory Login) ---
    // Define public paths that don't satisfy the protection rule
    const isPublicPath =
        path === "/login" ||
        path === "/register" ||
        path.startsWith("/api") ||
        path.startsWith("/_next") ||
        path.includes("."); // Catch-all for files (images, favicon, etc.)

    const isUserLoggedIn = request.cookies.get("user_session");

    if (!isUserLoggedIn && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect to home if logged in and trying to access login/register
    if (isUserLoggedIn && (path === "/login" || path === "/register")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
