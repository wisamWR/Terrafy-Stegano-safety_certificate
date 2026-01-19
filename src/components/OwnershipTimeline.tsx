"use client";

import { CheckCircle2, Circle, Clock, FileInput, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface OwnershipTimelineProps {
    items: {
        id: string;
        action: string;
        actor_name: string;
        owner_name: string;
        owner_email?: string;
        note: string;
        createdAt: string | Date;
    }[];
}

export function OwnershipTimeline({ items }: OwnershipTimelineProps) {
    // Filter only ownership-related events
    // 1. Pendaftaran (First Owner)
    // 2. Pengalihan Hak (Transfer Completed)
    const ownershipEvents = items.filter(item => 
        item.action === "Pendaftaran" || 
        item.action === "Pengalihan Hak"
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

    if (!ownershipEvents || ownershipEvents.length === 0) {
        return <div className="text-sm text-muted-foreground italic">Belum ada rekam jejak kepemilikan.</div>;
    }

    return (
        <div className="relative space-y-0 pl-2">
             {/* Vertical Line */}
            <div className="absolute left-[7px] top-3 bottom-0 w-[2px] bg-zinc-200" />

            {ownershipEvents.map((item, index) => {
                const isFirst = index === 0; // Current Owner
                const isCreation = item.action === "Pendaftaran";

                return (
                    <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0 group">
                         {/* Dot */}
                        <div className={cn(
                            "relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm mt-1.5",
                            isFirst ? "bg-black ring-4 ring-zinc-100" : "bg-zinc-300"
                        )}>
                            {isFirst && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>

                        <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-zinc-900 leading-tight">
                                {isCreation ? "Sertifikat Diterbitkan" : "Kepemilikan Berpindah"}
                            </h4>
                            
                            {/* Owner Card */}
                            <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100 w-full max-w-[250px] space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                                        {item.owner_name ? item.owner_name.charAt(0).toUpperCase() : "?"}
                                    </div>
                                    <p className="text-sm font-semibold truncate max-w-[180px]">
                                        {item.owner_name}
                                    </p>
                                </div>
                                {item.owner_email && (
                                    <p className="text-xs text-zinc-500 truncate pl-8">
                                        {item.owner_email}
                                    </p>
                                )}
                                <p className="text-[10px] text-zinc-400 pl-8 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric"
                                    })}
                                </p>
                            </div>

                             {/* Note */}
                             <p className="text-xs text-zinc-400 italic mt-1.5 ml-1">
                                "{isCreation ? "Penerbitan sertifikat baru" : item.note}"
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
