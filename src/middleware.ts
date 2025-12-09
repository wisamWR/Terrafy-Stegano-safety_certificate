import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Check if it's an admin route
    if (path.startsWith("/admin")) {
        const isAdminLoggedIn = request.cookies.get("admin_session");

        // Root admin redirect
        if (path === "/admin") {
            if (isAdminLoggedIn) {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            } else {
                return NextResponse.redirect(new URL("/admin/login", request.url));
            }
        }

        // Protect dashboard and other admin routes
        // Exclude login page to avoid infinite loop
        if (path !== "/admin/login" && !isAdminLoggedIn) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        // Redirect to dashboard if trying to access login while logged in
        if (path === "/admin/login" && isAdminLoggedIn) {
            return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/admin/:path*",
};
