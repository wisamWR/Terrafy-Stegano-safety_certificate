"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileCheck, History, LogOut, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Persetujuan",
        href: "/admin/persetujuan",
        icon: FileCheck,
    },
    {
        title: "History",
        href: "/admin/history",
        icon: History,
    },
];

type AdminSidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function AdminSidebar({ className }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn("pb-12 h-full bg-background border-r", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-6 px-4 h-12">
                        <div className="relative h-8 w-8">
                            <Image
                                src="/logo.png"
                                alt="Terrafy Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-blue-600">Terrafy<span className="text-foreground">Admin</span></h2>
                    </div>
                    <div className="space-y-1">
                        {sidebarItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={index}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm font-medium",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 left-6 right-6">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full h-auto p-2 flex items-center justify-between hover:bg-muted text-left border-muted-foreground/20"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                                    <AvatarFallback>AD</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start overflow-hidden">
                                    <p className="text-sm font-medium truncate w-24">Admin Terrafy</p>
                                    <p className="text-xs text-muted-foreground truncate w-24">admin@terrafy.com</p>
                                </div>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]" side="top" sideOffset={10}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">My Account</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    Manage your session
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={() => {
                                document.cookie = "admin_session=; path=/; max-age=0";
                                window.location.href = "/admin/login";
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
