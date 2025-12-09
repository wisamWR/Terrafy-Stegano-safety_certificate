"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Settings, User, ShieldCheck, Home, Clock, CheckCircle2, XCircle } from "lucide-react";
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
import { useState, useEffect } from "react";

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkSession = () => {
            const session = localStorage.getItem("auth_session");
            if (session) {
                setUser(JSON.parse(session));
            } else {
                setUser(null);
            }
        };

        checkSession();

        window.addEventListener("auth-change", checkSession);
        return () => window.removeEventListener("auth-change", checkSession);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("auth_session");
        setUser(null);
        window.dispatchEvent(new Event("auth-change"));
        router.push("/login");
        router.refresh();
    };

    const getInitials = (name: string) => {
        return name
            ? name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2)
            : "US";
    };

    const navItems = [
        { name: "Beranda", href: "/", icon: Home },
        { name: "Verifikasi", href: "/verifikasi", icon: ShieldCheck },
        { name: "Pengaturan", href: "/pengaturan", icon: Settings },
    ];

    type NotificationStatus = 'incoming' | 'pending' | 'accepted' | 'rejected';

    interface Notification {
        id: string;
        status: NotificationStatus;
        title: string;
        message: string;
        timestamp: Date;
        detailLink: string;
    }

    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            status: 'incoming',
            title: 'Sertifikat Menunggu Verifikasi',
            message: 'Permintaan sertifikat baru #S-001 perlu ditinjau.',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 30), // 30 mins ago
            detailLink: '/sertifikat/detail/1'
        },
        {
            id: '2',
            status: 'accepted',
            title: 'Sertifikat Terverifikasi',
            message: 'Sertifikat #S-002 telah disetujui.',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 24), // 1 day ago
            detailLink: '/sertifikat/detail/2'
        },
        {
            id: '3',
            status: 'rejected',
            title: 'Sertifikat Ditolak',
            message: 'Dokumen #S-003 tidak valid.',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 48), // 2 days ago
            detailLink: '/sertifikat/detail/3'
        }
    ]);

    const handleAccept = (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? {
                ...n,
                status: 'pending' as NotificationStatus,
                title: 'Menunggu Finalisasi',
                message: 'Verifikasi awal berhasil. Menunggu persetujuan admin pusat.'
            } : n
        ));
    };

    const handleReject = (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? {
                ...n,
                status: 'rejected' as NotificationStatus,
                title: 'Permintaan Ditolak',
                message: 'Anda telah menolak permintaan sertifikat ini.'
            } : n
        ));
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    };

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
                                <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-accent/10 transition-all duration-300 hover:scale-110 active:scale-95">
                                    <Bell className="h-5 w-5" />
                                    <span className="sr-only">Notifikasi</span>
                                    {/* Notification Dot Example */}
                                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle>Notifikasi</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification) => (
                                            <div key={notification.id} className="group flex flex-col gap-3 rounded-lg border p-4 bg-card text-card-foreground shadow-sm hover:shadow-md hover:bg-accent/5 transition-all duration-300 cursor-pointer hover:border-foreground/20">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {(notification.status === 'incoming' || notification.status === 'pending') && <Clock className="h-4 w-4" />}
                                                        {notification.status === 'accepted' && <CheckCircle2 className="h-4 w-4" />}
                                                        {notification.status === 'rejected' && <XCircle className="h-4 w-4" />}
                                                        <span className="text-sm font-semibold capitalize">
                                                            {notification.status === 'incoming' ? 'Konfirmasi Diperlukan' :
                                                                notification.status === 'pending' ? 'Menunggu Admin' :
                                                                    notification.status === 'accepted' ? 'Diterima' : 'Ditolak'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col gap-2 pt-2 border-t mt-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {formatDate(notification.timestamp).replace(/\./g, ':')}
                                                        </span>
                                                        <Button variant="link" className="h-auto p-0 text-xs text-foreground font-medium" asChild>
                                                            <Link href={notification.detailLink}>
                                                                Cek selengkapnya
                                                            </Link>
                                                        </Button>
                                                    </div>

                                                    {notification.status === 'incoming' && (
                                                        <div className="flex gap-2 w-full mt-1">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1 h-8 text-xs cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAccept(notification.id);
                                                                }}
                                                            >
                                                                Terima
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1 h-8 text-xs cursor-pointer hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all duration-200"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReject(notification.id);
                                                                }}
                                                            >
                                                                Tolak
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                                            <p className="text-sm">Tidak ada notifikasi saat ini</p>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* User Menu */}
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src="/avatars/01.png" alt="@user" />
                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/pengaturan">Pengaturan</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link href="/login">
                                <Button size="sm">Masuk</Button>
                            </Link>
                        )}

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
                                    {user && (
                                        <div className="p-6 border-t bg-muted/20">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                                    <AvatarImage src="/avatars/01.png" alt="@user" />
                                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button variant="outline" className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                                                Log out
                                            </Button>
                                        </div>
                                    )}
                                    {!user && (
                                        <div className="p-6 border-t bg-muted/20">
                                            <Link href="/login">
                                                <Button className="w-full">Masuk</Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}
