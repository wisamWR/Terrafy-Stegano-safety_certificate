"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Menu, Settings, User, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

export function Navbar() {
    const pathname = usePathname();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const navItems = [
        { name: "Beranda", href: "/", icon: Home },
        { name: "Verifikasi", href: "/verifikasi", icon: ShieldCheck },
        { name: "Pengaturan", href: "/pengaturan", icon: Settings },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                {/* Logo Section */}
                <div className="flex items-center gap-2">
                    <div className="relative h-10 w-10">
                        <Image
                            src="/logo.png"
                            alt="Terrafy Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold text-blue-600">Terrafy</span>
                </div>

                {/* Right Side Group (Nav + Actions) */}
                <div className="flex items-center gap-6">
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm font-medium transition-colors hover:text-blue-600 ${pathname === item.href
                                        ? "text-blue-600"
                                        : "text-muted-foreground"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Actions Section */}
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    <span className="sr-only">Notifikasi</span>
                                    {/* Notification Dot Example */}
                                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle>Notifikasi</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4 flex flex-col gap-4">
                                    <div className="rounded-lg border p-3 text-sm">
                                        <p className="font-medium">Selamat Datang!</p>
                                        <p className="text-muted-foreground">
                                            Akun Anda berhasil dibuat. Silahkan lengkapi profil Anda.
                                        </p>
                                        <span className="text-xs text-muted-foreground mt-2 block">
                                            Baru saja
                                        </span>
                                    </div>
                                    {/* More notifications can go here */}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/avatars/01.png" alt="@user" />
                                        <AvatarFallback>US</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">User</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            user@example.com
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/pengaturan">Pengaturan</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>Log out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile Menu Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                                <div className="flex flex-col h-full">
                                    {/* Header */}
                                    <SheetHeader className="p-6 border-b">
                                        <SheetTitle className="flex items-center gap-3 text-blue-600 font-bold text-left text-xl">
                                            <div className="relative h-10 w-10">
                                                <Image
                                                    src="/logo.png"
                                                    alt="Terrafy Logo"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                            Terrafy
                                        </SheetTitle>
                                    </SheetHeader>

                                    {/* Menu Items */}
                                    <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                                        {navItems.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                                            ? "bg-blue-50 text-blue-600 shadow-sm"
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        }`}
                                                >
                                                    <item.icon
                                                        className={`h-5 w-5 transition-colors ${isActive
                                                                ? "text-blue-600"
                                                                : "text-muted-foreground group-hover:text-foreground"
                                                            }`}
                                                    />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {/* Footer / User Section */}
                                    <div className="p-6 border-t bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                                <AvatarImage src="/avatars/01.png" alt="@user" />
                                                <AvatarFallback>US</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">User Name</span>
                                                <span className="text-xs text-muted-foreground">
                                                    user@example.com
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}
