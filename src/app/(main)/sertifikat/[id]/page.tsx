
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, UserCheck, ShieldCheck, MapPin, FileCheck, Info, Clock, AlertCircle, Send, CheckCircle, Lock } from "lucide-react";
import { getCertificateById } from "@/lib/actions/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TransferModal } from "@/components/TransferModal";
import { TransferConfirmation } from "@/components/TransferConfirmation";
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
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-6">
                    <Link
                        href="/sertifikat"
                        className="group flex w-fit items-center text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Kembali ke Daftar Sertifikat
                    </Link>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-glass">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{cert.nama_lahan}</h1>
                            <p className="text-slate-500 font-semibold flex items-center gap-2">
                                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold">Nomor Sertifikat</span>
                                <span className="font-mono text-blue-700 font-bold">{cert.nomor_sertifikat}</span>
                            </p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 border-2 shadow-md transition-all duration-500 ${cert.status === 'VERIFIED'
                            ? "bg-emerald-500 border-emerald-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.4)]"
                            : cert.status === 'REJECTED'
                                ? "bg-red-500 border-red-400 shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)]"
                                : "bg-amber-500 border-amber-400 shadow-[0_0_15px_-5px_rgba(245,158,11,0.4)]"
                            }`}>
                            <div className="bg-white/20 p-1 rounded-lg border border-white/20">
                                {cert.status === 'VERIFIED' && <ShieldCheck className="h-4 w-4 text-white" />}
                                {cert.status === 'REJECTED' && <AlertCircle className="h-4 w-4 text-white" />}
                                {cert.status === 'PENDING' && <Clock className="h-4 w-4 text-white" />}
                                {((cert.status as any) === 'TRANSFER_PENDING' || (cert.status as any) === 'AWAITING_RECIPIENT') && <Send className="h-4 w-4 text-white" />}
                            </div>
                            <span className="text-white font-bold uppercase tracking-[0.1em] text-xs">
                                {cert.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="glass-card border-white/50 shadow-glass-lg">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-md">
                                        <FileCheck className="h-5 w-5 text-white" />
                                    </div>
                                    Informasi Tanah
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Nama Sertifikat</p>
                                        <p className="font-medium text-zinc-900">{cert.nama_lahan}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Nomor Sertifikat</p>
                                        <p className="font-mono font-medium text-zinc-900">{cert.nomor_sertifikat}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Nama Pemegang Hak</p>
                                        <p className="font-medium text-zinc-900">{cert.owner.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Luas Tanah</p>
                                        <p className="font-medium text-zinc-900">{cert.luas_tanah}</p>
                                    </div>

                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Lokasi
                                    </div>
                                    <p className="text-sm leading-relaxed text-zinc-700">{cert.lokasi}</p>
                                </div>
                                {cert.keterangan && (
                                    <div className="space-y-1 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                                            <Info className="h-3.5 w-3.5" />
                                            Keterangan
                                        </div>
                                        <p className="text-sm leading-relaxed text-zinc-700">{cert.keterangan}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Steganography Metadata */}
                        {/* Security Badge Section */}
                        {cert.steganographyMetadata && (
                            <Card className="border-emerald-200 bg-emerald-500/5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-emerald-100 p-1">
                                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <CardTitle className="text-lg font-bold text-emerald-800">Keamanan Dokumen Terjamin</CardTitle>
                                    </div>
                                    <CardDescription className="text-emerald-700 font-semibold">
                                        Sertifikat ini telah melalui proses verifikasi digital oleh Admin dan dilindungi dengan teknologi enkripsi.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                                            <div className="rounded-full bg-emerald-100 p-1.5">
                                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-zinc-900">Validasi Admin</p>
                                                <p className="text-xs text-zinc-500">Telah diperiksa dan disetujui secara manual.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                                            <div className="rounded-full bg-emerald-100 p-1.5">
                                                <Lock className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-zinc-900">Proteksi Digital</p>
                                                <p className="text-xs text-zinc-500">Data sertifikat terkunci di dalam gambar (Steganografi).</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar: Status & Timeline */}
                    <div className="space-y-6">
                        <Card className="glass-card border-white/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-3">
                                    <div className="bg-slate-800 p-1.5 rounded-lg">
                                        <Info className="h-4 w-4 text-white" />
                                    </div>
                                    Validasi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-muted-foreground">Tanggal Terbit</p>
                                        <p className="text-sm font-medium">
                                            {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <UserCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-muted-foreground">Diverifikasi Oleh</p>
                                        <p className="text-sm font-medium">{cert.verifiedBy || '-'}</p>
                                        {cert.verifiedAt && (
                                            <p className="text-xs text-muted-foreground">
                                                pada {new Date(cert.verifiedAt).toLocaleDateString('id-ID')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {cert.rejectedBy && (
                                    <div className="rounded-md bg-red-500/10 p-4 border border-red-300 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]">
                                        <p className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Catatan Penolakan
                                        </p>
                                        <p className="text-sm text-red-900 leading-relaxed font-semibold italic bg-white/50 p-2 rounded">
                                            "{cert.rejectionReason || 'Tidak ada alasan'}"
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-red-500 mt-3 text-right">
                                            Ditolak Oleh {cert.rejectedBy} • {cert.rejectedAt ? new Date(cert.rejectedAt).toLocaleDateString('id-ID') : '-'}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Transfer Action for Owner */}
                        {isOwner && cert.status === 'VERIFIED' && (
                            <Card className="border-amber-300 bg-amber-500/10 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]">
                                <CardHeader className="pb-3 text-center">
                                    <CardTitle className="text-base font-bold text-amber-800 flex items-center justify-center gap-2">
                                        <div className="rounded-full bg-amber-500 p-1">
                                            <Send className="h-4 w-4 text-white" />
                                        </div>
                                        Transfer Kepemilikan
                                    </CardTitle>
                                    <CardDescription className="text-sm font-semibold text-amber-700 mt-1">
                                        Pindahkan hak kepemilikan sertifikat ini kepada orang lain.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TransferModal certId={cert.id} certName={cert.nama_lahan} currentUserEmail={session?.email} />
                                </CardContent>
                            </Card>
                        )}

                        {cert.status === 'TRANSFER_PENDING' && (
                            <Card className="border-amber-200 bg-amber-50 animate-pulse">
                                <CardHeader className="pb-3 text-center">
                                    <CardTitle className="text-sm font-bold text-amber-800">Transfer Sedang Diproses</CardTitle>
                                    <CardDescription className="text-xs">
                                        Menunggu persetujuan admin untuk dipindahkan ke:
                                        <span className="block font-mono font-bold mt-1 text-zinc-900">{(cert as any).transferToEmail}</span>
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        )}

                        {cert.status === 'AWAITING_RECIPIENT' && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardHeader className="pb-3 text-center">
                                    <CardTitle className="text-sm font-bold text-blue-800">Menunggu Konfirmasi Penerima</CardTitle>
                                    <CardDescription className="text-xs">
                                        Sertifikat ini sedang dalam proses pengalihan ke:
                                        <span className="block font-mono font-bold mt-1 text-zinc-900">{(cert as any).transferToEmail}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {session?.email === (cert as any).transferToEmail && (
                                        <TransferConfirmation certId={cert.id} certName={cert.nama_lahan} />
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card className="glass-card border-white/50 shadow-glass">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-3">
                                    <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-1.5 rounded-lg">
                                        <ShieldCheck className="h-4 w-4 text-white" />
                                    </div>
                                    Stego Image
                                </CardTitle>
                                <CardDescription className="text-slate-500 font-medium">Citra digital terproteksi steganografi.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {cert.steganographyMetadata?.stegoImage || cert.image_url ? (
                                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-zinc-100 group">
                                        <img
                                            src={cert.steganographyMetadata?.stegoImage || cert.image_url || ''}
                                            alt="Sertifikat Digital"
                                            className="object-contain w-full h-full transition-transform group-hover:scale-105 duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed bg-zinc-50 text-sm text-zinc-400">
                                        Tidak ada gambar
                                    </div>
                                )}

                                {(cert.steganographyMetadata?.stegoImage || cert.image_url) && (
                                    <a
                                        href={cert.steganographyMetadata?.stegoImage || cert.image_url || '#'}
                                        download
                                        target="_blank"
                                        className="block mt-4 w-full"
                                    >
                                        <Button variant="outline" className="w-full h-8 text-xs gap-2">
                                            {cert.steganographyMetadata?.stegoImage ? (
                                                <>
                                                    <ShieldCheck className="w-3 h-3 text-green-600" />
                                                    Unduh Stego Image (Aman)
                                                </>
                                            ) : (
                                                "Unduh Gambar Asli"
                                            )}
                                        </Button>
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
