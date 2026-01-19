
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, UserCheck, ShieldCheck, MapPin, FileCheck, Info, Clock, AlertCircle, Send, CheckCircle, Lock, Activity, History } from "lucide-react";
import { getCertificateById } from "@/lib/actions/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TransferModal } from "@/components/TransferModal";
import { TransferConfirmation } from "@/components/TransferConfirmation";
import { DownloadButton } from "@/components/DownloadButton";
import { OwnershipTimeline } from "@/components/OwnershipTimeline";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getCertificateById(id);

    const cookieStore = await cookies();
    const sessionValue = cookieStore.get("user_session")?.value;
    const session = sessionValue ? JSON.parse(sessionValue) : null;

    if (!result.success || !result.certificate) {
        return (
            <div className="p-12 text-center space-y-4">
                <h1 className="text-xl font-bold text-red-600">Terjadi Kesalahan</h1>
                <p>Gagal memuat sertifikat.</p>
                <div className="p-4 bg-red-100 text-red-800 rounded font-mono text-xs text-left overflow-auto">
                    {JSON.stringify(result, null, 2)}
                </div>
                <Link href="/sertifikat" className="text-blue-600 hover:underline">Kembali</Link>
            </div>
        )
    }

    const cert = result.certificate;
    const isOwner = session && cert.ownerId === session.id;

    return (
        <div className="min-h-screen p-6 lg:p-12">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header Navigation */}
                <div className="flex flex-col gap-4">
                    <Link
                        href="/sertifikat"
                        className="group flex w-fit items-center text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Kembali ke Daftar Sertifikat
                    </Link>
                </div>

                {/* ROW 1: STATUS & ACTION (Full Width Split 3/4 : 1/4) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Status Section (3/4) */}
                    <Card className={cn("lg:col-span-3 border-l-4 shadow-sm", 
                        cert.status === 'VERIFIED' ? "border-l-emerald-500 bg-emerald-50/50" : 
                        cert.status === 'REJECTED' ? "border-l-red-500 bg-red-50/50" : "border-l-amber-500 bg-amber-50/50")}>
                        <CardContent className="p-6 flex items-center gap-6">
                             <div className={cn("p-3 rounded-full shrink-0",
                                cert.status === 'VERIFIED' ? "bg-emerald-100 text-emerald-600" : 
                                cert.status === 'REJECTED' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600")}>
                                {cert.status === 'VERIFIED' ? <ShieldCheck className="h-8 w-8" /> : 
                                 cert.status === 'REJECTED' ? <AlertCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                                    {cert.status === 'VERIFIED' ? "Sertifikat Terverifikasi" : 
                                     cert.status === 'REJECTED' ? "Pengajuan Ditolak" : "Menunggu Verifikasi"}
                                </h2>
                                <p className="text-zinc-600 font-medium">
                                    {cert.status === 'VERIFIED' 
                                        ? `Dokumen ini sah dan telah divalidasi oleh ${cert.verifiedBy || 'Admin Sistem'}.` 
                                        : cert.status === 'REJECTED' 
                                            ? `Alasan: ${cert.rejectionReason || "Data tidak sesuai"}` 
                                            : "Dokumen sedang dalam antrean pemeriksaan oleh admin."}
                                </p>
                                {cert.verifiedAt && (
                                    <p className="text-xs text-zinc-500">
                                        Tanggal Validasi: {new Date(cert.verifiedAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Section (1/4) */}
                    <div className="lg:col-span-1 space-y-4">
                        {isOwner && cert.status === 'VERIFIED' && (
                             <Card className="h-full border-amber-200 bg-amber-50 hover:bg-amber-100/80 transition-colors cursor-pointer group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-amber-200/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 relative z-10">
                                    <div className="bg-white p-3 rounded-full shadow-sm ring-1 ring-amber-200 group-hover:scale-110 transition-transform">
                                        <Send className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-amber-900">Transfer Aset</h3>
                                        <p className="text-xs text-amber-700 mt-1">Pindahkan ke pemilik baru</p>
                                    </div>
                                    <div className="w-full pt-2">
                                        <TransferModal certId={cert.id} certName={cert.nama_lahan} currentUserEmail={session?.email} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {cert.status === 'AWAITING_RECIPIENT' && session?.email === (cert as any).transferToEmail && (
                            <Card className="h-full border-blue-200 bg-blue-50 animate-pulse">
                                <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
                                    <h4 className="font-bold text-blue-900 mb-2">Terima Transfer?</h4>
                                    <TransferConfirmation certId={cert.id} certName={cert.nama_lahan} />
                                </CardContent>
                            </Card>
                        )}

                         {/* Fallback if no action available */}
                         {!isOwner && cert.status !== 'AWAITING_RECIPIENT' && (
                             <Card className="h-full border-zinc-200 bg-zinc-50/50 flex items-center justify-center">
                                 <p className="text-xs text-zinc-400 font-medium">Tidak ada aksi tersedia</p>
                             </Card>
                         )}
                    </div>
                </div>

                {/* ROW 2: MAIN CONTENT (Image+Info vs History) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    
                    {/* LEFT COLUMN (3/4): Image & Info */}
                    <div className="lg:col-span-3 space-y-8">
                        
                        {/* 1. Certificate Image */}
                        <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-zinc-100 bg-white">
                            <div className="relative aspect-[16/9] w-full bg-zinc-50 border-b group">
                                {cert.steganographyMetadata?.stegoImage || cert.image_url ? (
                                    <img
                                        src={cert.steganographyMetadata?.stegoImage || cert.image_url || ''}
                                        alt="Sertifikat Digital"
                                        className="object-contain w-full h-full p-4 transition-transform duration-700 group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <div className="flex w-full h-full items-center justify-center text-zinc-400">
                                        Tidak ada gambar sertifikat
                                    </div>
                                )}
                                
                                {/* Stego Badge Overlay */}
                                {cert.steganographyMetadata && (
                                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20 shadow-xl">
                                        <Lock className="h-3 w-3 text-emerald-400" />
                                        <span>Secured by Steganography</span>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-4 flex items-center justify-between bg-zinc-50/80 backdrop-blur-sm">
                                <div className="text-sm font-medium text-zinc-600 flex items-center gap-2">
                                    <FileCheck className="h-4 w-4" />
                                    Dokumen Digital Asli
                                </div>
                                <DownloadButton 
                                    url={cert.steganographyMetadata?.stegoImage || cert.image_url || ''}
                                    filename={`${cert.nama_lahan.replace(/\s+/g, '_')}_${cert.nomor_sertifikat}.png`}
                                    isStego={!!cert.steganographyMetadata?.stegoImage}
                                />
                            </CardContent>
                        </Card>

                        {/* 2. Certificate Information */}
                        <Card className="shadow-md border-zinc-200">
                            <CardHeader className="border-b bg-zinc-50/50 px-6 py-4">
                                <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
                                    <Info className="h-5 w-5 text-zinc-500" />
                                    Informasi Sertifikat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 lg:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nomor Sertifikat</p>
                                        <p className="text-lg font-bold text-zinc-900 font-mono tracking-tight">{cert.nomor_sertifikat}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nama Sertifikat</p>
                                        <p className="text-lg font-bold text-zinc-900">{cert.nama_lahan}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Luas Area</p>
                                        <p className="text-lg font-bold text-zinc-900">{cert.luas_tanah}</p>
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lokasi Aset</p>
                                        <p className="text-base font-medium text-zinc-900 flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                            {cert.lokasi}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tanggal Terbit</p>
                                        <p className="text-base font-bold text-zinc-900">
                                            {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                        </p>
                                    </div>
                                </div>
                                
                                {cert.keterangan && (
                                    <div className="mt-8 pt-6 border-t border-dashed">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Keterangan Tambahan</p>
                                        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 text-sm text-zinc-700 italic leading-relaxed">
                                            "{cert.keterangan}"
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN (1/4): Ownership History */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="h-fit min-h-[500px] border-zinc-200 shadow-md sticky top-6">
                            <CardHeader className="pb-4 border-b bg-zinc-50/80">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-900">
                                    <History className="h-4 w-4" />
                                    Jejak Rekam Kepemilikan
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Riwayat pemegang hak sertifikat ini.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 px-4">
                                <OwnershipTimeline items={cert.history} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
