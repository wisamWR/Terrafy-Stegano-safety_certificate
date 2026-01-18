"use client";

import Link from "next/link";
import { useEffect, use, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCertificateById, updateCertificateStatus } from "@/lib/actions/certificates";
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
    History,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [imageZoomOpen, setImageZoomOpen] = useState(false);
    const [certificate, setCertificate] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const result = await getCertificateById(id);
            if (result.success && result.certificate) {
                setCertificate(result.certificate);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const [successStatus, setSuccessStatus] = useState<"approved" | "rejected" | null>(null);

    const handleAction = async (action: "approve" | "reject", reason?: string) => {
        setIsProcessing(true);
        const status = action === "approve" ? "VERIFIED" : "REJECTED";
        const result = await updateCertificateStatus(id, status, reason);
        if (result.success) {
            setSuccessStatus(action === "approve" ? "approved" : "rejected");
        } else {
            alert(result.error);
        }
        setIsProcessing(false);
    };

    const handleSuccessClose = () => {
        setSuccessStatus(null);
        router.push("/admin/persetujuan");
        router.refresh();
    };

    if (loading) return <div className="p-12 text-center">Loading...</div>;
    if (!certificate) return <div className="p-12 text-center">Sertifikat tidak ditemukan</div>;

    const getStatusBadge = (status: string) => {
        if (status === 'Pending' || status === 'PENDING') {
            return (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Menunggu Verifikasi
                </Badge>
            );
        }
        if (status === 'TRANSFER_PENDING') {
            return (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Permohonan Pengalihan
                </Badge>
            );
        }
        return <Badge variant="secondary">{status}</Badge>;
    };

    const isTransfer = certificate.status === "TRANSFER_PENDING";

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
                            <h1 className="text-3xl font-bold tracking-tight">
                                {isTransfer ? "Detail Pengalihan Hak" : "Detail Pengajuan"}
                            </h1>
                            {getStatusBadge(certificate.status)}
                        </div>
                        <p className="text-muted-foreground">
                            ID Aset: <span className="font-mono font-medium text-foreground">{certificate.id}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (2/3): Image & Metadata */}
                <div className="md:col-span-2 space-y-6">
                    {/* Image Card remains unchanged */}
                    <Card className="overflow-hidden">
                        <div
                            className="relative aspect-video w-full cursor-zoom-in bg-zinc-100 dark:bg-zinc-800"
                            onClick={() => setImageZoomOpen(true)}
                        >
                            <Image
                                src={certificate.image_url || "/certificate_dummy.png"}
                                alt="Sertifikat Fisik"
                                fill
                                className="object-cover transition-transform hover:scale-105"
                                unoptimized
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                                <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white">
                                    <ZoomIn className="h-4 w-4" />
                                    <span className="text-sm font-medium">Perbesar</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                <CardTitle className="text-lg">Informasi Sertifikat</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {isTransfer && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                        <Send className="h-4 w-4" />
                                        Informasi Pengalihan Hak
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Pemilik Saat Ini</p>
                                            <p className="font-semibold text-amber-900">{certificate.owner.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Calon Pemilik Baru</p>
                                            <p className="font-semibold text-amber-900">{certificate.transferToEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nomor Sertifikat</span>
                                    <div className="font-medium">{certificate.nomor_sertifikat}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nama Lahan</span>
                                    <div className="font-medium">{certificate.nama_lahan}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Luas Area</span>
                                    <div className="font-medium">{certificate.luas_tanah}</div>
                                </div>
                                <div className="space-y-1">
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

                {/* Right Column (1/3): Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    {/* Action Card */}
                    <Card className={`border-l-4 shadow-md ${isTransfer ? "border-l-amber-500" : "border-l-blue-600"}`}>
                        <CardHeader>
                            <CardTitle className="text-lg">Tindakan Diperlukan</CardTitle>
                            <CardDescription>
                                {isTransfer ? "Tinjau permohonan pengalihan hak kepemilikan ini." : "Tinjau data sebelum mengambil keputusan."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className={`w-full shadow-sm ${isTransfer ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`} size="lg" disabled={isProcessing}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {isTransfer ? "Setujui Pengalihan" : "Setujui Pengajuan"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Konfirmasi {isTransfer ? "Pengalihan Hak" : "Persetujuan"}</AlertDialogTitle>
                                        {isTransfer ? (
                                            <p>Anda akan menyetujui pengalihan sertifikat ini kepada <b>{certificate.transferToEmail}</b>. Data steganografi akan diperbarui otomatis.</p>
                                        ) : (
                                            <p>Anda akan menyetujui pendaftaran aset oleh <b>{certificate.owner.name}</b>. Tindakan ini akan tercatat.</p>
                                        )}
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction("approve")} className={isTransfer ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}>
                                            Ya, Saya Yakin
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" size="lg" disabled={isProcessing}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        {isTransfer ? "Tolak Pengalihan" : "Tolak Pengajuan"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Konfirmasi Penolakan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {isTransfer ? "Permohonan pengalihan akan dibatalkan dan status kembali ke pemilik lama." : "Pengajuan ini akan ditolak dan dikembalikan ke pemohon."}
                                        </AlertDialogDescription>
                                        <div className="grid gap-2 py-4">
                                            <Label htmlFor="reason" className="text-left font-semibold">Alasan Penolakan</Label>
                                            <Textarea
                                                id="reason"
                                                placeholder="Berikan alasan..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="resize-none"
                                            />
                                        </div>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction("reject", rejectionReason)} className="bg-destructive hover:bg-destructive/90">
                                            Ya, Tolak
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>

                    {/* Status Pengajuan (Timeline) */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">History Terkini</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-zinc-200 ml-3 space-y-8 pb-2">
                                {certificate.history.map((h: any, i: number) => {
                                    const isLatest = i === 0;
                                    return (
                                        <div key={i} className="relative pl-6">
                                            <span
                                                className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ring-1 ring-zinc-200 ${isLatest ? "bg-primary" : "bg-zinc-400"}`}
                                            />
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-sm font-semibold leading-none ${isLatest ? 'text-primary' : 'text-foreground'}`}>
                                                    {h.action}
                                                </span>
                                                <div className="text-xs text-muted-foreground mt-1 leading-snug space-y-1">
                                                    <p className="font-medium text-foreground">Oleh: {h.actor_name || "Sistem"}</p>
                                                    {h.note && <p className="italic">"{h.note}"</p>}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-1 pt-1 border-t w-fit">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(h.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Owner Details Box */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Detail Pemilik</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Nama Pemegang Hak</p>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium">{certificate.owner.name}</p>
                                    <p className="text-xs text-muted-foreground">{certificate.owner.email}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Terdaftar Sejak</p>
                                <p className="text-sm font-medium">{new Date(certificate.createdAt).toLocaleDateString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {
                imageZoomOpen && (
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
                )
            }

            {/* Success Popup Dialog */}
            <AlertDialog open={!!successStatus} onOpenChange={(val) => { if (!val) handleSuccessClose(); }}>
                <AlertDialogContent>
                    <AlertDialogHeader className="items-center text-center">
                        <div className={`rounded-full p-3 mb-4 ${successStatus === 'approved' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            {successStatus === 'approved' ? (
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            ) : (
                                <XCircle className="h-10 w-10 text-red-600" />
                            )}
                        </div>
                        <AlertDialogTitle className="text-xl">
                            {successStatus === 'approved' ? 'Berhasil Disetujui' : 'Berhasil Ditolak'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center pt-2">
                            {successStatus === 'approved'
                                ? "Sertifikat telah berhasil disetujui. Notifikasi telah dikirim ke pemilik."
                                : "Sertifikat telah ditolak. Status akan diperbarui dan pemilik akan diberitahu."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogAction onClick={handleSuccessClose} className="w-full sm:w-auto min-w-[120px]">
                            Kembali ke Daftar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
