"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Settings, User, ShieldCheck, Home, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/actions/auth";
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
    const [notifications, setNotifications] = useState<any[]>([]);

    // Fetch notifications
    const loadNotifications = async (userId: string) => {
        try {
            const { getUserNotifications } = await import("@/lib/actions/certificates");
            const result = await getUserNotifications(userId);
            if (result.success && result.notifications) {
                console.log(`[NAVBAR] SUCCESS: Loaded ${result.notifications.length} notifications`);
                setNotifications(result.notifications);
            } else {
                console.log(`[NAVBAR] EMPTY OR FAILED:`, result);
            }
        } catch (e) {
            console.error("[NAVBAR] ERROR fetching notifications:", e);
        }
    };

    useEffect(() => {
        const load = async () => {
            const session = localStorage.getItem("auth_session");
            if (session) {
                const userData = JSON.parse(session);
                setUser(userData);
                await loadNotifications(userData.id);
            } else {
                setUser(null);
                setNotifications([]);
            }
        };

        load();

        window.addEventListener("auth-change", load);
        window.addEventListener("refresh-notifications", load);
        // Optional: Poll every 30s
        const interval = setInterval(load, 30000);
        return () => {
            window.removeEventListener("auth-change", load);
            window.removeEventListener("refresh-notifications", load);
            clearInterval(interval);
        };
    }, []);

    const handleLogout = async () => {
        await logoutUser();
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

    const handleMarkRead = async (id: string, link?: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

        try {
            const { markNotificationAsRead } = await import("@/lib/actions/certificates");
            await markNotificationAsRead(id);
        } catch (e) {
            console.error(e);
        }

        if (link) {
            router.push(link);
            setIsNotificationsOpen(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (notifications.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        try {
            const { markAllNotificationsAsRead } = await import("@/lib/actions/certificates");
            await markAllNotificationsAsRead(user.id);
        } catch (e) {
            console.error(e);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'CERTIFICATE_VERIFIED': return <div className="bg-emerald-500 p-1 rounded-md shadow-sm border border-emerald-400/50"><CheckCircle2 className="h-3.5 w-3.5 text-white" /></div>;
            case 'CERTIFICATE_REJECTED': return <div className="bg-red-500 p-1 rounded-md shadow-sm border border-red-400/50"><XCircle className="h-3.5 w-3.5 text-white" /></div>;
            case 'CERTIFICATE_PENDING': return <div className="bg-amber-500 p-1 rounded-md shadow-sm border border-amber-400/50"><Clock className="h-3.5 w-3.5 text-white" /></div>;
            case 'TRANSFER_REQUEST': return <div className="bg-blue-500 p-1 rounded-md shadow-sm border border-blue-400/50"><Send className="h-3.5 w-3.5 text-white" /></div>;
            default: return <div className="bg-slate-500 p-1 rounded-md shadow-sm border border-slate-400/50"><Bell className="h-3.5 w-3.5 text-white" /></div>;
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;



    return (
        <nav className="sticky top-0 z-50 w-full glass-card border-b border-white/20 shadow-glass">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                {/* Logo Section */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative h-10 w-10 transition-transform group-hover:scale-110">
                        <Image
                            src="/logo.png"
                            alt="Terrafy Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold text-gradient-primary">Terrafy</span>
                </Link>

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
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 border-l border-white/20 bg-white/40 backdrop-blur-2xl">
                                <SheetHeader className="p-6 border-b border-white/20 bg-white/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
                                                <Bell className="h-5 w-5 text-white" />
                                            </div>
                                            <SheetTitle className="text-xl font-bold">Notifikasi</SheetTitle>
                                        </div>
                                        {unreadCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] uppercase font-bold tracking-widest text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-7"
                                                onClick={handleMarkAllRead}
                                            >
                                                Tandai Semua Selesai
                                            </Button>
                                        )}
                                    </div>
                                </SheetHeader>
                                <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-300 cursor-pointer active:scale-95 ${notification.isRead
                                                    ? 'bg-white/30 border-white/40 opacity-70 grayscale-[0.3]'
                                                    : 'bg-white/80 border-blue-200/50 shadow-blue-500/5 ring-1 ring-blue-500/5'
                                                    } hover:shadow-md hover:border-blue-400/30 hover:bg-white/90`}
                                                onClick={() => handleMarkRead(notification.id, notification.certificateId ? `/sertifikat/${notification.certificateId}` : undefined)}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        {getIcon(notification.type)}
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${notification.type === 'CERTIFICATE_VERIFIED' ? 'text-emerald-700' :
                                                            notification.type === 'CERTIFICATE_REJECTED' ? 'text-red-700' :
                                                                notification.type === 'CERTIFICATE_PENDING' ? 'text-amber-700' :
                                                                    notification.type === 'TRANSFER_REQUEST' ? 'text-blue-700' : 'text-slate-700'
                                                            }`}>
                                                            {notification.type === 'CERTIFICATE_VERIFIED' ? 'Terverifikasi' :
                                                                notification.type === 'CERTIFICATE_REJECTED' ? 'Ditolak' :
                                                                    notification.type === 'CERTIFICATE_PENDING' ? 'Dalam Proses' :
                                                                        notification.type === 'TRANSFER_REQUEST' ? 'Permohonan Transfer' : 'Informasi'}
                                                        </span>
                                                    </div>
                                                    {!notification.isRead && (
                                                        <div className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <p className={`text-sm font-bold leading-tight ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notification.title}</p>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                        {notification.message}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100/50">
                                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(notification.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {notification.certificateId && (
                                                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                            Detail →
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="bg-slate-100 p-6 rounded-full mb-4 opacity-50 ring-8 ring-slate-50">
                                                <Bell className="h-10 w-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-600">Aliran Sepi</h3>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Belum ada kegiatan penting yang perlu kami sampaikan.</p>
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
                                            <AvatarImage src={user.image || ""} alt="@user" className="object-cover" />
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
                                                    <AvatarImage src={user.image || ""} alt="@user" className="object-cover" />
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
