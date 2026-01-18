"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Search,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    ListFilter,
    FileText
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getUserCertificates } from "@/lib/actions/certificates";
import { useEffect } from "react";

// Type definitions
type SortOption = "newest" | "oldest" | "az" | "za";

export default function CertificateListPage() {
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [itemsPerPage, setItemsPerPage] = useState("12");
    const [currentPage, setCurrentPage] = useState(1);
    const [certificates, setCertificates] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            const result = await getUserCertificates();
            if (result.success && result.certificates) {
                const mapped = result.certificates.map((c: any) => ({
                    id: c.id,
                    title: c.nama_lahan,
                    nomor: c.nomor_sertifikat,
                    subtitle: c.keterangan || "Sertifikat Digital",
                    address: c.lokasi,
                    luas: c.luas_tanah,
                    tanggal: new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                    rawDate: new Date(c.createdAt),
                    status: c.status,
                }));
                setCertificates(mapped);
            }
        };
        load();
    }, []);

    // Filter & Sort Logic
    const filteredData = useMemo(() => {
        let result = [...certificates];

        // 1. Search
        if (searchTerm) {
            const lowerQuery = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.nomor.toLowerCase().includes(lowerQuery) ||
                item.address.toLowerCase().includes(lowerQuery)
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case "newest":
                    return b.rawDate.getTime() - a.rawDate.getTime();
                case "oldest":
                    return a.rawDate.getTime() - b.rawDate.getTime();
                case "az":
                    return a.title.localeCompare(b.title);
                case "za":
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [certificates, searchTerm, sortOption]);

    // Pagination Logic
    const totalItems = filteredData.length;
    const perPage = parseInt(itemsPerPage);
    const totalPages = Math.ceil(totalItems / perPage);

    const displayedData = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return filteredData.slice(start, start + perPage);
    }, [filteredData, currentPage, perPage]);

    // Handlers
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to page 1 on search
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 p-6 lg:p-12">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header & Breadcrumb */}
                <div className="flex flex-col gap-2">
                    <Link
                        href="/"
                        className="group flex w-fit items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
                    >
                        <div className="mr-2 rounded-full p-1 group-hover:bg-accent">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        Kembali ke Beranda
                    </Link>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Semua Sertifikat</h1>
                            <p className="mt-2 text-zinc-500">
                                Kelola dan pantau seluruh aset digital Anda.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Analytics / Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Sertifikat
                            </CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{certificates.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Dokumen tersimpan
                            </p>
                        </CardContent>
                    </Card>
                    {/* Add more stats if available, e.g. "Total Luas", "Terakhir Upload" */}
                </div>

                {/* Toolbar: Search, Sort, Limit */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Cari berdasarkan nama, nomor..."
                            className="pl-9 bg-zinc-50 border-zinc-200"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={sortOption} onValueChange={(v: SortOption) => setSortOption(v)}>
                            <SelectTrigger className="w-[160px] bg-zinc-50 border-zinc-200">
                                <ListFilter className="mr-2 h-3.5 w-3.5" />
                                <SelectValue placeholder="Urutkan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Terbaru</SelectItem>
                                <SelectItem value="oldest">Terlama</SelectItem>
                                <SelectItem value="az">Nama (A-Z)</SelectItem>
                                <SelectItem value="za">Nama (Z-A)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={itemsPerPage} onValueChange={(v) => {
                            setItemsPerPage(v);
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="w-[130px] bg-zinc-50 border-zinc-200">
                                <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                                <SelectValue placeholder="Tampilan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 per hal.</SelectItem>
                                <SelectItem value="12">12 per hal.</SelectItem>
                                <SelectItem value="24">24 per hal.</SelectItem>
                                <SelectItem value="48">48 per hal.</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Grid Content */}
                {displayedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900">Tidak ada sertifikat ditemukan</h3>
                        <p className="text-zinc-500 mt-1 max-w-sm">
                            Coba ubah kata kunci pencarian atau filter Anda.
                        </p>
                        <Button
                            variant="link"
                            className="mt-4"
                            onClick={() => { setSearchTerm(""); setSortOption("newest"); }}
                        >
                            Reset Filter
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayedData.map((c) => (
                            <Link key={c.id} href={`/sertifikat/${c.id}`}>
                                <Card className={`group h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${c.status === 'PENDING' ? 'border-amber-400 bg-amber-50/50' : 'border-zinc-200 bg-white hover:border-primary/50'}`}>
                                    <CardHeader className="space-y-1">
                                        <div className="flex items-start justify-between">
                                            <Badge variant="outline" className="mb-2 bg-zinc-50 text-zinc-600 border-zinc-200">
                                                {c.nomor}
                                            </Badge>
                                            {c.status === 'PENDING' && (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-lg font-bold text-zinc-900 truncate leading-tight">
                                            {c.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 text-xs">
                                            {c.subtitle}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 gap-y-2 text-sm text-zinc-600">
                                            <div className="flex justify-between items-center py-1 border-b border-dashed border-zinc-100">
                                                <span className="text-xs font-medium text-zinc-400">Luas Tanah</span>
                                                <span className="font-semibold text-zinc-700">{c.luas}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-dashed border-zinc-100">
                                                <span className="text-xs font-medium text-zinc-400">Tanggal Upload</span>
                                                <span className="font-semibold text-zinc-700">{c.tanggal}</span>
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-xs text-zinc-400 mb-1">Lokasi</p>
                                                <p className="text-sm font-medium text-zinc-800 line-clamp-1">{c.address}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalItems > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
                        <div className="text-sm text-zinc-500">
                            Menampilkan <span className="font-medium text-zinc-900">{(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, totalItems)}</span> dari <span className="font-medium text-zinc-900">{totalItems}</span> data
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page)}
                                    className={`h-8 w-8 p-0 ${currentPage !== page ? 'hidden sm:inline-flex' : ''}`}
                                >
                                    {page}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
