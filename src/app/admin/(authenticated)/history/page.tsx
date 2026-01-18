"use client";

import Link from "next/link";
import { FileText, CheckCircle, XCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { getAdminHistory } from "@/lib/actions/certificates";

// Type definition
type HistoryItem = {
    id: string;
    certNo: string;
    owner: string;
    action: string;
    date: string;
    status: "Approved" | "Rejected" | "Other";
};



export const columns: ColumnDef<HistoryItem>[] = [
    {
        accessorKey: "date",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Tanggal
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => <span className="opacity-70 text-sm">{row.getValue("date")}</span>,
    },
    {
        accessorKey: "id",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Kode
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "certNo",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    No. Sertifikat
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("certNo")}</span>,
    },
    {
        accessorKey: "owner",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Pemilik
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "action",
        header: "Aktivitas",
        cell: ({ row }) => <Badge variant="outline" className="font-normal">{row.getValue("action")}</Badge>,
    },

    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            if (status === "Approved") {
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 gap-1 pl-1.5 shadow-sm font-normal">
                        <CheckCircle className="h-3.5 w-3.5" /> Berhasil
                    </Badge>
                );
            } else if (status === "Rejected") {
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 gap-1 pl-1.5 shadow-sm font-normal">
                        <XCircle className="h-3.5 w-3.5" /> Ditolak
                    </Badge>
                );
            } else {
                return (
                    <Badge variant="secondary" className="gap-1 pl-1.5 shadow-sm font-normal">
                        Info
                    </Badge>
                );
            }
        },
    },
    {
        id: "actions",
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => {
            return (
                <div className="text-center">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" asChild>
                        <Link href={`/admin/history/${row.original.id}`}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Detail</span>
                        </Link>
                    </Button>
                </div>
            );
        },
    },
];

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const load = async () => {
            const result = await getAdminHistory();
            if (result.success && result.history) {
                const mapped = result.history.map((h: any) => ({
                    id: h.id,
                    certNo: h.certificate.nomor_sertifikat,
                    owner: h.owner_name || "Unknown",
                    action: h.action,
                    date: new Date(h.createdAt).toLocaleString('id-ID'),
                    status: (h.action === "Verifikasi" ? "Approved" : h.action === "Penolakan" ? "Rejected" : "Other") as "Approved" | "Rejected" | "Other",
                }));
                setHistory(mapped);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">History Pengajuan</h1>
                <p className="text-muted-foreground">
                    Riwayat lengkap semua aktivitas verifikasi dan pendaftaran sertifikat.
                </p>
            </div>

            <DataTable columns={columns} data={history} searchKey="certNo" searchPlaceholder="Filter No. Sertifikat..." />
        </div>
    );
}
