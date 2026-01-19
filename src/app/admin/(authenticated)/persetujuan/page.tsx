"use client";

import Link from "next/link";
import { FileText, ArrowUpDown, AlertTriangle } from "lucide-react";
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
    rawStatus?: string;
    duplicateCount?: number;
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
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium">{row.getValue("id")}</span>
                {(row.original.duplicateCount || 0) > 1 && (
                     <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1" title={`${row.original.duplicateCount} sertifikat dengan nomor sama!`}>
                        <AlertTriangle className="h-3 w-3" />
                         Ganda
                     </Badge>
                )}
            </div>
        ),
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ArrowRightLeft } from "lucide-react";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

export function ApprovalContent() {
    const searchParams = useSearchParams();
    const router = useRouter(); // Use router for refreshing if needed
    const initialTab = searchParams.get("tab");
    
    // Set active tab based on URL param, default to 'new'
    const [activeTab, setActiveTab] = useState(initialTab === "transfer" ? "transfer" : "new");

    // Sync state if URL changes
    useEffect(() => {
        if (initialTab === "transfer" || initialTab === "new") {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const result = await getAllCertificates();
            if (result.success && result.certificates) {
                const mapped: Approval[] = result.certificates.map((c: any) => ({
                    id: c.id,
                    certNo: c.nomor_sertifikat,
                    owner: c.owner.name,
                    type: "Sertifikat Tanah", // Dynamic logic could be added
                    date: new Date(c.createdAt).toLocaleDateString(),
                    status: c.status === "VERIFIED" ? "Disetujui" : (c.status === "REJECTED" ? "Ditolak" : "Menunggu"),
                    rawStatus: c.status,
                    duplicateCount: c.duplicateCount || 0 // Map conflict flag
                }));
                setApprovals(mapped);
            }
            setLoading(false);
        };
        load();
    }, []);

    const newRegistrations = approvals.filter(a => a.rawStatus === "PENDING");
    const transferRequests = approvals.filter(a => a.rawStatus === "TRANSFER_PENDING");

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Daftar Persetujuan</h1>
                <p className="text-muted-foreground">
                    Kelola permintaan pendaftaran sertifikat dan permohonan pengalihan hak.
                </p>
            </div>

            <Tabs value={activeTab} className="w-full">
                <TabsContent value="new" className="mt-0 space-y-4">
                    <DataTable columns={columns} data={newRegistrations} searchKey="certNo" searchPlaceholder="Cari Sertifikat..." />
                </TabsContent>
                
                <TabsContent value="transfer" className="mt-0 space-y-4">
                    <DataTable columns={columns} data={transferRequests} searchKey="certNo" searchPlaceholder="Cari Sertifikat..." />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function ApprovalPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ApprovalContent />
        </Suspense>
    )
}
