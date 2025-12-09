"use client";

import Link from "next/link";
import { FileText, CheckCircle, XCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Type definition
type HistoryItem = {
    id: string;
    certNo: string;
    sender: string;
    receiver: string;
    type: string;
    date: string;
    status: "Approved" | "Rejected";
};

// Dummy data for history
const historyData: HistoryItem[] = [
    {
        id: "TRX-004",
        certNo: "SERT-2019-552",
        sender: "Joko Widodo",
        receiver: "Prabowo Subianto",
        type: "Jual Beli",
        date: "2024-12-05",
        status: "Approved",
    },
    {
        id: "TRX-005",
        certNo: "SERT-2021-102",
        sender: "Megawati",
        receiver: "Puan Maharani",
        type: "Hibah",
        date: "2024-12-04",
        status: "Rejected",
    },
    {
        id: "TRX-006",
        certNo: "SERT-2015-888",
        sender: "Susilo Bambang Yudhoyono",
        receiver: "Agus Harimurti",
        type: "Warisan",
        date: "2024-12-03",
        status: "Approved",
    },
    {
        id: "TRX-007",
        certNo: "SERT-2018-999",
        sender: "Abdurrahman Wahid",
        receiver: "Yenny Wahid",
        type: "Warisan",
        date: "2024-12-02",
        status: "Approved",
    },
    {
        id: "TRX-008",
        certNo: "SERT-2020-111",
        sender: "BJ Habibie",
        receiver: "Ilham Habibie",
        type: "Hibah",
        date: "2024-12-01",
        status: "Approved",
    },
];

export const columns: ColumnDef<HistoryItem>[] = [
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
        accessorKey: "sender",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Pengirim
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "receiver",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Penerima
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "type",
        header: "Jenis",
        cell: ({ row }) => <Badge variant="outline" className="font-normal">{row.getValue("type")}</Badge>,
    },
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return status === "Approved" ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 gap-1 pl-1.5 shadow-sm font-normal">
                    <CheckCircle className="h-3.5 w-3.5" /> Disetujui
                </Badge>
            ) : (
                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 gap-1 pl-1.5 shadow-sm font-normal">
                    <XCircle className="h-3.5 w-3.5" /> Ditolak
                </Badge>
            );
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
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">History Pengajuan</h1>
                <p className="text-muted-foreground">
                    Riwayat lengkap semua transaksi dan perubahan kepemilikan.
                </p>
            </div>

            <DataTable columns={columns} data={historyData} searchKey="certNo" searchPlaceholder="Filter No. Sertifikat..." />
        </div>
    );
}
