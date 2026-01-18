"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    ZoomIn,
    X,
    Activity,
    History as HistoryIcon,
    CheckCircle,
    User,
    Send
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getHistoryDetail } from "@/lib/actions/certificates";

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [imageZoomOpen, setImageZoomOpen] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const result = await getHistoryDetail(id);
            if (result.success) {
                setData(result.history);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-12 text-center">Memuat detail riwayat...</div>;
    if (!data) return <div className="p-12 text-center text-red-600 font-bold">Data riwayat tidak ditemukan</div>;

    const history = data;
    const certificate = history.certificate;

    const getStatusBadge = (status: string) => {
        if (status === 'VERIFIED') {
            return (
                <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 border-0">
                    <CheckCircle className="h-3 w-3" />
                    Terverifikasi
                </Badge>
            );
        } else if (status === 'REJECTED') {
            return (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Ditolak
                </Badge>
            );
        }
        return <Badge variant="secondary">{status}</Badge>;
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Navigation */}
            <div className="flex flex-col gap-4">
                <Button variant="ghost" className="w-fit pl-0 hover:bg-transparent hover:text-foreground text-muted-foreground" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">Detail Aktivitas</h1>
                            {getStatusBadge(certificate.status)}
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">
                            RIWAYAT_ID: {history.id}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (2/3): Image & Metadata */}
                <div className="md:col-span-2 space-y-6">
                    {/* Activity Summary Alert */}
                    <Alert className={`border-l-4 ${history.action === 'Verifikasi' ? 'bg-emerald-50 border-emerald-500' : 'bg-blue-50 border-blue-500'}`}>
                        <Activity className={`h-4 w-4 ${history.action === 'Verifikasi' ? 'text-emerald-600' : 'text-blue-600'}`} />
                        <AlertTitle className="font-bold">{history.action}</AlertTitle>
                        <AlertDescription>
                            {history.note || "Aktivitas pada sertifikat."}
                            <div className="mt-1 text-xs text-muted-foreground">
                                Oleh: <b>{history.actor_name}</b> ({history.actor_email}) • {new Date(history.createdAt).toLocaleString('id-ID')}
                            </div>
                        </AlertDescription>
                    </Alert>

                    {/* Image Card */}
                    <Card className="overflow-hidden">
                        <div
                            className="relative aspect-video w-full cursor-zoom-in bg-zinc-100 dark:bg-zinc-800"
                            onClick={() => setImageZoomOpen(true)}
                        >
                            <Image
                                src={certificate.image_url || "/certificate_dummy.png"}
                                alt="Sertifikat"
                                fill
                                className="object-cover transition-transform hover:scale-105"
                                unoptimized
                            />
                        </div>
                    </Card>

                    {/* Certificate Info Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                <CardTitle className="text-lg">Informasi Sertifikat</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nomor Sertifikat</span>
                                    <div className="font-semibold">{certificate.nomor_sertifikat}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nama Sertifikat</span>
                                    <div className="font-semibold">{certificate.nama_lahan}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Luas Area</span>
                                    <div className="font-semibold">{certificate.luas_tanah}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pemilik (Saat Aktivitas)</span>
                                    <div className="font-semibold">{history.owner_name}</div>
                                    <div className="text-xs text-muted-foreground italic">{history.owner_email}</div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lokasi</span>
                                    <div className="flex items-center gap-2 font-medium">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        {certificate.lokasi}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1/3): Sidebar Timeline */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <HistoryIcon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Seluruh Riwayat Aset</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pl-6">
                            <div className="relative border-l-2 border-zinc-200 ml-3 space-y-8 pb-4">
                                {certificate.history.map((h: any, index: number) => (
                                    <div key={index} className="relative pl-6">
                                        <span
                                            className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ring-1 ring-zinc-200 ${h.id === history.id ? "bg-primary" : "bg-zinc-300"}`}
                                        />
                                        <div className="flex flex-col gap-1">
                                            <div className="flex flex-col">
                                                <h3 className={`text-sm font-semibold ${h.id === history.id ? "text-primary" : "text-foreground"}`}>
                                                    {h.action}
                                                </h3>
                                                <span className="text-[10px] w-fit mt-0.5 text-muted-foreground bg-zinc-100 px-1.5 py-0.5 rounded border italic">
                                                    Pemilik: {h.owner_name || "Unknown"}
                                                </span>
                                                <span className="text-[10px] font-medium text-zinc-600 mt-1">
                                                    Oleh: {h.actor_name || "Sistem"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(h.createdAt).toLocaleString('id-ID')}</span>
                                            </div>
                                            {h.note && (
                                                <div className="mt-1.5 rounded bg-muted/40 p-1.5 text-xs text-zinc-500 italic leading-tight">
                                                    "{h.note}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {imageZoomOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
                    onClick={() => setImageZoomOpen(false)}
                >
                    <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg shadow-2xl">
                        <button
                            onClick={() => setImageZoomOpen(false)}
                            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="flex h-auto w-auto max-w-full max-h-full items-center justify-center">
                            <Image
                                src={certificate.image_url || "/certificate_dummy.png"}
                                alt="Full Certificate"
                                width={1000}
                                height={600}
                                className="object-contain max-h-[85vh] w-auto rounded-md"
                                unoptimized
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
