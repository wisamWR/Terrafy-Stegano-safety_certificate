"use client";

import Link from "next/link";
import { FileText, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Type definition
type Approval = {
    id: string;
    certNo: string;
    sender: string;
    receiver: string;
    type: string;
    date: string;
    status: string;
};

// Dummy data
const approvals: Approval[] = [
    {
        id: "TRX-001",
        certNo: "SERT-2024-001",
        sender: "Budi Santoso",
        receiver: "Ahmad Dahlan",
        type: "Jual Beli",
        date: "2024-12-10",
        status: "Pending",
    },
    {
        id: "TRX-002",
        certNo: "SERT-2024-089",
        sender: "Siti Aminah",
        receiver: "Yayasan Wakaf",
        type: "Wakaf",
        date: "2024-12-09",
        status: "Pending",
    },
    {
        id: "TRX-003",
        certNo: "SERT-2024-156",
        sender: "Joko Widodo",
        receiver: "Ma'ruf Amin",
        type: "Hibah",
        date: "2024-12-08",
        status: "Pending",
    },
    {
        id: "TRX-004",
        certNo: "SERT-2024-201",
        sender: "Rina Nose",
        receiver: "Andre Taulany",
        type: "Jual Beli",
        date: "2024-12-07",
        status: "Pending",
    },
    {
        id: "TRX-005",
        certNo: "SERT-2024-202",
        sender: "Sule",
        receiver: "Rizwan",
        type: "Warisan",
        date: "2024-12-06",
        status: "Pending",
    },
];

export const columns: ColumnDef<Approval>[] = [
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
        cell: ({ row }) => (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200/50 shadow-sm">
                {row.getValue("status")}
            </Badge>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => {
            return (
                <div className="text-center">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" asChild>
                        <Link href={`/admin/persetujuan/${row.original.id}`}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Detail</span>
                        </Link>
                    </Button>
                </div>
            );
        },
    },
];

export default function ApprovalPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Daftar Persetujuan</h1>
                <p className="text-muted-foreground">
                    Kelola permintaan perpindahan sertifikat yang masuk dan memerlukan tindakan.
                </p>
            </div>

            <DataTable columns={columns} data={approvals} searchKey="certNo" searchPlaceholder="Filter No. Sertifikat..." />
        </div>
    );
}
