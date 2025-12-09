"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    ShieldCheck,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Download,
    Share2,
    Building2,
    User
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Dummy Data Database
const CERTIFICATE_DB: any = {
    "1": {
        id: "1",
        status: "pending",
        number: "REQ/2024/XII/001",
        owner: "Budi Santoso",
        location: "Jl. Merdeka Selatan No. 45, Jakarta Pusat",
        area: "250 m²",
        type: "Hak Milik (SHM)",
        requestDate: "2024-12-09T10:00:00",
        description: "Pengajuan sertifikat tanah waris keluarga.",
        history: [
            { date: "2024-12-09 10:00", info: "Pengajuan dibuat", user: "Budi Santoso" },
            { date: "2024-12-09 10:05", info: "Dokumen diunggah", user: "System" },
            { date: "2024-12-09 23:55", info: "Menunggu verifikasi admin", user: "System" }
        ]
    },
    "2": {
        id: "2",
        status: "accepted",
        number: "11.22.33.44.5.67890",
        owner: "Siti Aminah",
        location: "Kawasan Industri Cikarang Blok B2, Bekasi",
        area: "5,000 m²",
        type: "Hak Guna Bangunan (HGB)",
        requestDate: "2024-12-01T08:00:00",
        issueDate: "2024-12-08T14:30:00",
        issuer: "Kantor Pertanahan Kab. Bekasi",
        description: "Sertifikat HGB untuk pabrik tekstil.",
        history: [
            { date: "2024-12-01 08:00", info: "Pengajuan dibuat", user: "Siti Aminah" },
            { date: "2024-12-02 09:00", info: "Verifikasi dokumen fisik", user: "Admin BPN" },
            { date: "2024-12-05 13:00", info: "Pengukuran ulang lokasi", user: "Surveyor" },
            { date: "2024-12-08 14:30", info: "Sertifikat diterbitkan", user: "Kepala BPN" }
        ]
    },
    "3": {
        id: "3",
        status: "rejected",
        number: "REQ/2024/XI/999",
        owner: "PT. Maju Mundur",
        location: "Lahan Sengketa X, Surabaya",
        area: "1,200 m²",
        type: "Hak Milik (SHM)",
        requestDate: "2024-11-20T11:00:00",
        description: "Pengajuan balik nama sertifikat #12345.",
        rejectionReason: "Dokumen bukti kepemilikan tidak lengkap dan terdapat sengketa aktif.",
        history: [
            { date: "2024-11-20 11:00", info: "Pengajuan dibuat", user: "Admin PT" },
            { date: "2024-11-25 10:00", info: "Pengecekan sengketa", user: "Legal BPN" },
            { date: "2024-11-26 15:45", info: "Pengajuan ditolak", user: "Admin Pusat" }
        ]
    }
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function CertificateDetailPage({ params }: PageProps) {
    // Unwrap params using React.use()
    const { id } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API fetch delay
        setTimeout(() => {
            const foundData = CERTIFICATE_DB[id];
            setData(foundData || CERTIFICATE_DB["1"]); // Default to 1 if not found for demo
            setLoading(false);
        }, 500);
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Memuat data sertifikat...</p>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="outline" className="border-foreground/20 text-foreground flex items-center gap-1 bg-background">
                        <Clock className="h-3 w-3" />
                        Menunggu Finalisasi
                    </Badge>
                );
            case 'accepted':
                return (
                    <Badge variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 border-0">
                        <ShieldCheck className="h-3 w-3" />
                        Terverifikasi
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="outline" className="border-foreground text-foreground flex items-center gap-1 bg-background">
                        <XCircle className="h-3 w-3" />
                        Ditolak
                    </Badge>
                );
            default:
                return <Badge variant="secondary">Unknown</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 lg:p-12">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header Navigation */}
                <div className="flex flex-col gap-4">
                    <Link
                        href="/"
                        className="flex w-fit items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Kembali ke Beranda
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight">Detail Sertifikat</h1>
                                {getStatusBadge(data.status)}
                            </div>
                            <p className="text-muted-foreground">
                                ID Referensi: <span className="font-mono font-medium text-foreground">{data.number}</span>
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Share2 className="h-4 w-4" />
                                Bagikan
                            </Button>
                            {data.status === 'accepted' && (
                                <Button size="sm" className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Download className="h-4 w-4" />
                                    Unduh Dokumen
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rejection Notice */}
                {data.status === 'rejected' && (
                    <div className="rounded-lg border border-foreground/10 bg-muted/30 p-4">
                        <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Pengajuan Ditolak</p>
                                <p className="text-sm text-muted-foreground">{data.rejectionReason}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Metadata */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5" />
                                    Informasi Properti
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pemilik Terdaftar</span>
                                        <div className="flex items-center gap-2 font-medium">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            {data.owner}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipe Hak</span>
                                        <div className="font-medium">{data.type}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Luas Area</span>
                                        <div className="font-medium">{data.area}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal Pengajuan</span>
                                        <div className="flex items-center gap-2 font-medium">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {new Date(data.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lokasi Properti</span>
                                    <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-md">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                        <p className="text-sm leading-relaxed">{data.location}</p>
                                    </div>
                                    <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm border">
                                        <div className="flex flex-col items-center gap-2">
                                            <MapPin className="h-8 w-8 opacity-20" />
                                            <span>Peta Lokasi (Simulasi)</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {data.status === 'accepted' && (
                            <Card className="border shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Building2 className="h-5 w-5" />
                                        Penerbit Sertifikat
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-1">
                                            <p className="font-medium">{data.issuer}</p>
                                            <p className="text-xs text-muted-foreground">Diterbitkan secara digital pada {new Date(data.issueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <ShieldCheck className="h-8 w-8 text-foreground/20" />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Timeline/Sidebar */}
                    <div className="space-y-6">
                        <Card className="border shadow-none h-fit">
                            <CardHeader>
                                <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
                                <CardDescription>Jejak rekam verifikasi dokumen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative border-l ml-3 space-y-8 py-2">
                                    {data.history.map((item: any, i: number) => (
                                        <div key={i} className="relative pl-6">
                                            <span className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border bg-background ${i === data.history.length - 1 ? 'border-primary ring-4 ring-primary/10' : 'border-muted-foreground'}`} />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium leading-none">{item.info}</span>
                                                <span className="text-xs text-muted-foreground">{item.user}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                    {new Date(item.date).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
