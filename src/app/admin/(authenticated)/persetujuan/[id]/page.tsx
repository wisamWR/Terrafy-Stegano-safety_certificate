"use client";

import Link from "next/link";
import { useEffect, use, useState, useRef } from "react";
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
import { Timeline } from "@/components/Timeline";
import { OwnershipTimeline } from "@/components/OwnershipTimeline";
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

// ImageMagnifier Component with Pan & Zoom (Fixed Scroll)
function ImageMagnifier({ src }: { src: string }) {
    const containerRef = useRef<HTMLDivElement>(null); 
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [imageSize, setImageSize] = useState<{ w: number, h: number } | null>(null);
    const [showMagnifier, setShowMagnifier] = useState(false);
    
    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [panning, setPanning] = useState(false);
    const [point, setPoint] = useState({ x: 0, y: 0 });
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

    // Use ref to attach non-passive listener for wheel to prevent scroll
    const containerCallbackRef = (node: HTMLDivElement | null) => {
        if (node) {
             const onWheel = (e: WheelEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const delta = e.deltaY * -0.01;
                setScale(prevScale => {
                    const newScale = Math.min(Math.max(1, prevScale + delta), 4);
                    if (newScale === 1) setPoint({ x: 0, y: 0 });
                    return newScale;
                });
            };
            node.addEventListener('wheel', onWheel, { passive: false });
            // Cleanup fn called when node changes
            return () => node.removeEventListener('wheel', onWheel); 
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Handle Panning if active
        if (panning && scale > 1) {
            e.preventDefault();
            const x = e.clientX - startPoint.x;
            const y = e.clientY - startPoint.y;
            setPoint({ x: x, y: y });
            return;
        }

        // Handle Magnifier only if NOT zoomed out
        if (scale === 1) {
            const elem = e.currentTarget;
            const { top, left, width, height } = elem.getBoundingClientRect();
            const x = e.clientX - left;
            const y = e.clientY - top;
            setPosition({ x, y });
            setImageSize({ w: width, h: height });
            setShowMagnifier(true);
        } else {
            setShowMagnifier(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setPanning(true);
            setStartPoint({ x: e.clientX - point.x, y: e.clientY - point.y });
        }
    };

    const handleMouseUp = () => {
        setPanning(false);
    };

    const handleMouseLeave = () => {
        setShowMagnifier(false);
        setPosition(null);
        setPanning(false);
    };

    const magnifierSize = 150; 
    const zoomLevel = 2.5; 

    return (
        <div 
            ref={containerCallbackRef}
            className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800 border shadow-sm touch-none overflow-hidden rounded-lg group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{ cursor: scale > 1 ? (panning ? 'grabbing' : 'grab') : 'none' }}
        >
            <div 
                className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out will-change-transform"
                style={{
                    transform: `scale(${scale}) translate(${point.x / scale}px, ${point.y / scale}px)`
                }}
            >
                 <Image
                    src={src}
                    alt="Sertifikat Fisik"
                    fill
                    className="object-contain"
                    unoptimized
                    draggable={false}
                />
            </div>
           
            {/* Magnifier Lens - Only show if not global zoomed */}
            {showMagnifier && position && imageSize && scale === 1 && (
                <div 
                    className="absolute pointer-events-none border-2 border-white shadow-2xl rounded-full bg-white bg-no-repeat"
                    style={{
                        width: `${magnifierSize}px`,
                        height: `${magnifierSize}px`,
                        left: `${position.x - magnifierSize / 2}px`,
                        top: `${position.y - magnifierSize / 2}px`,
                        backgroundImage: `url('${src}')`,
                        backgroundSize: `${imageSize.w * zoomLevel}px ${imageSize.h * zoomLevel}px`,
                        backgroundPosition: `-${position.x * zoomLevel - magnifierSize / 2}px -${position.y * zoomLevel - magnifierSize / 2}px`,
                        zIndex: 50
                    }}
                >
                     <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"></div>
                </div>
            )}
            
            <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none">
                {scale === 1 && (
                     <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
                        Hover: Magnify | Scroll: Zoom
                    </div>
                )}
                 {scale > 1 && (
                     <div className="bg-indigo-600/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-md animate-in fade-in">
                        Zoom: {Math.round(scale * 100)}% (Drag to Pan)
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [certificate, setCertificate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [successStatus, setSuccessStatus] = useState<"approved" | "rejected" | null>(null);
    const [imageZoomOpen, setImageZoomOpen] = useState(false); 

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

    // Auto-close success modal after 2 seconds
    useEffect(() => {
        if (successStatus) {
            const timer = setTimeout(() => {
                handleSuccessClose();
            }, 2000); 
            return () => clearTimeout(timer);
        }
    }, [successStatus]);

    // Data Loading with Debug Logs
    useEffect(() => {
        const load = async () => {
            console.log("[CLIENT] Starting getCertificateById for:", id);
            const result = await getCertificateById(id);
            console.log("[CLIENT] getCertificateById result:", result);
            
            if (result.success && result.certificate) {
                setCertificate(result.certificate);
            } else {
                console.error("[CLIENT] Failed to load certificate:", result.error);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading data...</div>;
    if (!certificate) return <div className="p-12 text-center text-red-500">Sertifikat tidak ditemukan (ID Invalid)</div>;

    const getStatusBadge = (status: string) => {
        if (status === 'Pending' || status === 'PENDING') {
             return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Menunggu Verifikasi</Badge>;
        }
        if (status === 'TRANSFER_PENDING') {
            return (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Permohonan Pengalihan
                </Badge>
            );
        }
        if (status === 'VERIFIED') return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Terverifikasi</Badge>;
        if (status === 'REJECTED') return <Badge variant="destructive">Ditolak</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    };

    const isTransfer = certificate.status === "TRANSFER_PENDING";

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Navigation */}
            <div className="flex flex-col gap-4 mb-2">
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

            {/* CONFLICT ALERT - Full Width */}
            {certificate.conflicts && certificate.conflicts.length > 0 && (
                <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 shadow-sm animate-pulse mb-6">
                    <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="space-y-2">
                            <h4 className="font-bold text-red-900 dark:text-red-300">Peringatan: Duplikasi Terdeteksi!</h4>
                            <p className="text-sm text-red-800 dark:text-red-200">
                                Nomor Sertifikat <b>{certificate.nomor_sertifikat}</b> juga digunakan oleh pengajuan lain:
                            </p>
                            <ul className="text-sm space-y-1 list-disc list-inside text-red-800 font-medium">
                                {certificate.conflicts.map((c: any) => (
                                    <li key={c.id}>
                                        Oleh: {c.ownerName} (Status: {c.status}) 
                                        <span className="text-xs opacity-75 ml-1">- {new Date(c.created_at).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Split View: Image (Left) vs Data (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left Column: Image Viewer & ACTIONS */}
                <div className="space-y-6">
                    <Card className="overflow-hidden shadow-md border-0 ring-1 ring-zinc-200">
                         <div className="bg-zinc-50/50 p-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                                <FileText className="h-4 w-4" />
                                Preview Dokumen Fisik
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-normal tracking-wide gap-1">
                                    <ZoomIn className="h-3 w-3" /> SCROLL
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-normal tracking-wide">
                                    HD
                                </Badge>
                            </div>
                        </div>
                        {/* Fixed Height for Image Viewer */}
                        <div className="p-1 bg-white h-[500px] relative">
                             <ImageMagnifier src={certificate.image_url || "/certificate_dummy.png"} />
                        </div>
                    </Card>

                    {/* MOVED HERE: Actions Panel (Keputusan Admin) */}
                    <Card className="border-l-4 border-l-indigo-500 shadow-md">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                                Keputusan Admin
                            </CardTitle>
                            <CardDescription>
                                Tinjau seluruh data di atas (Fisik & Digital) sebelum memberikan keputusan final.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {(certificate.status === "PENDING" || certificate.status === "Pending" || certificate.status === "TRANSFER_PENDING") ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Catatan / Alasan (Opsional)</Label>
                                        <Textarea
                                            placeholder={isTransfer 
                                                ? "Berikan alasan jika menolak transfer, atau catatan tambahan..." 
                                                : "Berikan alasan jika menolak, atau catatan tambahan jika menyetujui..."
                                            }
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            className="min-h-[100px]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-12 border-red-200 text-red-700 dark:text-red-400 hover:bg-red-50 hover:text-red-800 dark:hover:text-red-300"
                                            onClick={() => handleAction("reject", rejectionReason)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? "Proses..." : (isTransfer ? "Tolak Transfer" : "Tolak Pengajuan")}
                                        </Button>
                                        <Button
                                            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                                            onClick={() => handleAction("approve")}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? "Proses..." : (isTransfer ? "Setujui Transfer" : "Setujui & Terbitkan")}
                                        </Button>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 text-center">
                                        *Tindakan ini akan dicatat dalam audit log.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                     <div className={`mx-auto rounded-full p-2 w-fit mb-2 ${certificate.status === 'VERIFIED' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                        {certificate.status === 'VERIFIED' ? (
                                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                        ) : (
                                            <XCircle className="h-6 w-6 text-red-600" />
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-lg">
                                        Status: {certificate.status === 'VERIFIED' ? "DISETUJUI" : "DITOLAK"}
                                    </h4>
                                     <p className="text-sm text-muted-foreground">
                                        Diproses pada {new Date(certificate.updatedAt).toLocaleDateString()}
                                    </p>
                                    {certificate.rejectionReason && (
                                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                                            "{certificate.rejectionReason}"
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Data & Info */}
                <div className="space-y-6">
                     {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Informasi Digital</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {isTransfer && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                        <Send className="h-4 w-4" />
                                        Transfer Info
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Dari</p>
                                            <p className="font-semibold text-amber-900 dark:text-amber-300">{certificate.owner.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Kepada</p>
                                            <p className="font-semibold text-amber-900 dark:text-amber-300">{certificate.transferToEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Nomor Sertifikat</span>
                                    <div className="font-mono text-lg font-bold tracking-tight bg-slate-50 p-2 border rounded border-slate-200">
                                        {certificate.nomor_sertifikat}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">Nama Lahan</span>
                                        <div className="font-medium text-sm">{certificate.nama_lahan}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">Luas</span>
                                        <div className="font-medium text-sm">{certificate.luas_tanah}</div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Lokasi</span>
                                    <div className="flex items-start gap-2 font-medium text-sm p-2 bg-slate-50 rounded border">
                                        <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                        {certificate.lokasi}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Owner & Security Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2 p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <User className="h-4 w-4" /> Pemohon
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-sm space-y-2">
                                <div className="font-medium">{certificate.owner.name}</div>
                                <div className="text-muted-foreground truncate">{certificate.owner.email}</div>
                                <div className="text-xs text-muted-foreground">{new Date(certificate.createdAt).toLocaleDateString()}</div>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader className="pb-2 p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> Metadata
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-xs space-y-2">
                                 <div>
                                    <span className="text-muted-foreground block">Checksum</span>
                                    <span className="font-mono bg-slate-100 px-1 rounded">{certificate.id.substring(0, 8)}...</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Enkripsi</span>
                                    <span className="font-medium">AES-256-GCM</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* SIDE-BY-SIDE HISTORY: Logs Level + Ownership Level */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Admin Log Timeline */}
                        <Card className="h-full">
                             <CardHeader className="pb-2 p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <History className="h-4 w-4" /> Log Aktivitas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Timeline items={certificate.history} />
                            </CardContent>
                        </Card>

                        {/* 2. Ownership Timeline (New) */}
                        <Card className="h-full border-blue-100 bg-blue-50/30">
                             <CardHeader className="pb-2 p-4">
                                <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                                    <User className="h-4 w-4" /> History Kepemilikan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <OwnershipTimeline items={certificate.history} />
                            </CardContent>
                        </Card>
                    </div>

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
