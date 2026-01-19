import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, FileCheck, History, LogOut, ChevronsUpDown, ChevronDown, ChevronRight, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logoutUser, getSession } from "@/lib/actions/auth";
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
        // Add children for dropdown
        children: [
            {
                title: "Validasi Baru",
                href: "/admin/persetujuan?tab=new",
                icon: CheckCircle2
            },
            {
                title: "Validasi Transfer",
                href: "/admin/persetujuan?tab=transfer",
                icon: ArrowRightLeft
            }
        ]
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
    const searchParams = useSearchParams();
    
    // State to track open dropdowns
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        "Persetujuan": true // Default open
    });

    const toggleMenu = (title: string) => {
        setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const [user, setUser] = useState<{ name: string, email: string, image?: string } | null>(null);

    useEffect(() => {
        getSession().then((session) => {
            if (session) {
                setUser(session);
            }
        });
    }, []);

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
                            // Check active for main items
                            const isActive = item.href === pathname || (item.children && pathname.startsWith(item.href));
                            const hasChildren = item.children && item.children.length > 0;
                            const isOpen = openMenus[item.title];

                            return (
                                <div key={index}>
                                    {hasChildren ? (
                                        <button
                                            onClick={() => toggleMenu(item.title)}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all text-sm font-medium hover:bg-muted text-muted-foreground",
                                                isActive && "text-foreground font-semibold"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-4 w-4" />
                                                {item.title}
                                            </div>
                                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </button>
                                    ) : (
                                        <Link
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
                                    )}

                                    {/* Render Children */}
                                    {hasChildren && isOpen && (
                                        <div className="ml-4 mt-1 space-y-1 border-l pl-2 border-slate-200">
                                            {item.children?.map((child, childIndex) => {
                                                const ChildIcon = child.icon;
                                                const currentTab = searchParams.get('tab');
                                                const isChildActive = pathname === child.href.split('?')[0] && 
                                                                    (child.href.includes(`tab=${currentTab}`) || (!currentTab && child.href.includes('tab=new')));

                                                return (
                                                    <Link
                                                        key={childIndex}
                                                        href={child.href}
                                                        className={cn(
                                                            "flex items-center gap-2 rounded-lg px-3 py-2 transition-all text-sm",
                                                            isChildActive
                                                                ? "text-blue-600 font-medium bg-blue-50"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <ChildIcon className="h-3.5 w-3.5" />
                                                        {child.title}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
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
                                    <AvatarImage src={user?.image || "/placeholder-user.jpg"} alt="Admin" />
                                    <AvatarFallback>{user?.name ? user.name.substring(0, 2).toUpperCase() : "AD"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start overflow-hidden">
                                    <p className="text-sm font-medium truncate w-24">{user?.name || "Memuat..."}</p>
                                    <p className="text-xs text-muted-foreground truncate w-24">{user?.email || ""}</p>
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
                            onClick={async () => {
                                await logoutUser();
                                window.location.href = "/admin/login"; // Force client redirect
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
