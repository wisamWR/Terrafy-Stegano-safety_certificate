"use client";

import { CheckCircle2, Circle, Clock, FileInput, UserCheck, Search, Send, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimelineProps {
    items: {
        id: string;
        action: string;
        actor_name: string;
        note: string;
        createdAt: string | Date;
    }[];
}

export function Timeline({ items }: TimelineProps) {
    if (!items || items.length === 0) {
        return <div className="text-sm text-muted-foreground italic">Belum ada riwayat.</div>;
    }

    // Map icons based on action keywords
    const getIcon = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes("dibuat") || lower.includes("pendaftaran")) return <FileInput className="h-4 w-4" />;
        if (lower.includes("konfirmasi") || lower.includes("transfer")) return <Send className="h-4 w-4" />;
        if (lower.includes("verifikasi admin") || lower.includes("disetujui")) return <CheckCircle2 className="h-4 w-4" />;
        if (lower.includes("ditolak")) return <XCircle className="h-4 w-4" />;
        if (lower.includes("menunggu")) return <Clock className="h-4 w-4" />;
        if (lower.includes("peninjauan")) return <Search className="h-4 w-4" />;
        return <Circle className="h-4 w-4" />;
    };

    const getColor = (action: string) => {
         const lower = action.toLowerCase();
        if (lower.includes("disetujui") || lower.includes("verifikasi")) return "text-emerald-600 bg-emerald-100";
        if (lower.includes("ditolak")) return "text-red-600 bg-red-100";
        if (lower.includes("konfirmasi") || lower.includes("transfer")) return "text-blue-600 bg-blue-100";
        return "text-slate-600 bg-slate-100";
    };

    return (
        <div className="relative space-y-0 pl-2">
             {/* Vertical Line */}
            <div className="absolute left-[19px] top-2 bottom-4 w-[2px] bg-zinc-200 dark:bg-zinc-700" />

            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0 group">
                         {/* Dot/Icon */}
                        <div className={cn(
                            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm transition-all group-hover:scale-110",
                            getColor(item.action)
                        )}>
                            {getIcon(item.action)}
                        </div>

                        <div className="flex flex-col pt-1">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
                                {item.action}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 mb-1.5 leading-relaxed">
                                {item.note || `Oleh ${item.actor_name}`}
                            </p>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 w-fit px-1.5 py-0.5 rounded border border-zinc-100 dark:border-zinc-800">
                                <Clock className="h-3 w-3" />
                                {new Date(item.createdAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                }).replace(/\./g, ':')} 
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
