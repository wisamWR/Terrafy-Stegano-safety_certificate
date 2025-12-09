"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const pathname = usePathname();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-background md:flex fixed inset-y-0 z-50">
                <AdminSidebar />
            </aside>

            {/* Mobile Header & Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 px-6 backdrop-blur md:hidden">
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle Sidebar</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64 border-r-0 bg-background">
                            <div className="sr-only">
                                <SheetTitle>Admin Navigation</SheetTitle>
                                <SheetDescription>Navigation menu for admin dashboard</SheetDescription>
                            </div>
                            <AdminSidebar />
                        </SheetContent>
                    </Sheet>
                    <h2 className="ml-4 text-lg font-semibold">Admin Panel</h2>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
