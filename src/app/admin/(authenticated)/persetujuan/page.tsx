"use client";

import Link from "next/link";
import { FileText, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { useEffect, useState } from "react";
import { getAllCertificates } from "@/lib/actions/certificates";

// Type definition
type Approval = {
    id: string;
    certNo: string;
    owner: string;
    type: string;
    date: string;
    status: string;
};



export const columns: ColumnDef<Approval>[] = [
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
        accessorKey: "type",
        header: "Jenis",
        cell: ({ row }) => <Badge variant="outline" className="font-normal">{row.getValue("type")}</Badge>,
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
    const [approvals, setApprovals] = useState<Approval[]>([]);

    useEffect(() => {
        const load = async () => {
            const result = await getAllCertificates();
            if (result.success && result.certificates) {
                const mapped = result.certificates
                    .filter((c: any) => c.status === "PENDING" || c.status === "TRANSFER_PENDING")
                    .map((c: any) => ({
                        id: c.id,
                        certNo: c.nomor_sertifikat,
                        owner: c.owner.name || c.owner.email || "User",
                        type: c.status === "TRANSFER_PENDING" ? "Pengalihan Hak" : "Pendaftaran",
                        date: new Date(c.createdAt).toLocaleString('id-ID'),
                        status: c.status === "TRANSFER_PENDING" ? "Transfer" : "Pending",
                    }));
                setApprovals(mapped);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Daftar Persetujuan</h1>
                <p className="text-muted-foreground">
                    Kelola permintaan pendaftaran sertifikat dan permohonan pengalihan hak yang memerlukan tindakan.
                </p>
            </div>

            <DataTable columns={columns} data={approvals} searchKey="certNo" searchPlaceholder="Filter No. Sertifikat..." />
        </div>
    );
}
