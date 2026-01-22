"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, FileText, User, Calendar, History, ZoomIn, X, Upload, ShieldCheck, ShieldAlert, MapPin, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

import { verifyCertificateImage } from "@/lib/actions/certificates";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Certificate {
    nama: string;
    nomor: string;
    luas: string;
    location: string;
    keterangan: string | null;
    ownerName: string | null;
    ownerEmail: string;
    isOwnerMatch?: boolean;
    imageOwnerName?: string;
    status: string;
    transferToEmail?: string | null;
    history: {
        name: string;
        email: string;
        type: string;
        date: string;
        note: string;
    }[];
}

export default function VerificationPage() {
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [imageZoomOpen, setImageZoomOpen] = useState(false);
    const [result, setResult] = useState<Certificate | null>(null);

    // Create object URL for the uploaded file to display it
    const fileUrl = file ? URL.createObjectURL(file) : null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus("idle")
            setErrorMessage("")
        }
    }

    const handleVerify = async () => {
        if (!file) return
        setStatus("loading")
        setResult(null);
        setErrorMessage("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await verifyCertificateImage(formData);

            if (response.success && response.certificate) {
                setResult({
                    ...response.certificate,
                    isOwnerMatch: response.isOwnerMatch,
                    imageOwnerName: response.imageOwnerName
                });
                setStatus("success");
            } else {
                setStatus("error");
                setErrorMessage(response.error || "Gagal memverifikasi sertifikat.");
            }
        } catch (error) {
            console.error("Verification error:", error);
            setStatus("error");
            setErrorMessage("Terjadi kesalahan sistem.");
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className={`mx-auto space-y-8 transition-all duration-500 ${status === 'success' ? 'max-w-6xl' : 'max-w-3xl'}`}>
                {/* Back Button */}
                <div className="flex items-center">
                    <Link
                        href="/"
                        className="group flex items-center text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Kembali ke Beranda
                    </Link>
                </div>

                {/* Verification Input Card */}
                <Card className={`glass-card transition-all duration-300 border-white/40 ${status === "success" ? "opacity-90" : "shadow-glass-lg"}`}>
                    <CardHeader className="pb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                                <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verifikasi Keaslian Sertifikat</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                                    Unggah file sertifikat (stego-image) untuk memvalidasi integritas data
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-end bg-white/40 p-6 rounded-2xl border border-white/50 overflow-hidden">
                            <div className="flex-1 min-w-0 space-y-3">
                                <Label className="text-sm font-bold text-slate-700">Pilih File Gambar Sertifikat</Label>
                                <div
                                    onClick={() => document.getElementById('certificate-image')?.click()}
                                    className="h-14 bg-white/60 hover:bg-white/80 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex items-center px-4 cursor-pointer transition-all group active:scale-[0.98] overflow-hidden"
                                >
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-4 py-2 rounded-xl mr-4 shadow-md group-hover:shadow-blue-500/20 transition-all uppercase tracking-widest whitespace-nowrap shrink-0">
                                        Pilih Gambar
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 truncate min-w-0">
                                        {file ? file.name : "Klik untuk mencari file..."}
                                    </span>
                                    <input
                                        id="certificate-image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleVerify}
                                disabled={!file || status === "loading"}
                                size="lg"
                                className="h-14 w-full sm:w-auto px-10 btn-gradient-primary shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all gap-3 font-bold uppercase tracking-tighter"
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-6 w-6" />
                                        Verifikasi
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Error State */}
                {status === "error" && (
                    <Card className="glass-card border-red-300 bg-red-500/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] animate-in fade-in slide-in-from-top-4">
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="bg-red-500 p-4 rounded-full shadow-lg mb-4">
                                <XCircle className="h-12 w-12 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">Sertifikat Tidak Valid</h3>
                            <p className="text-red-900 dark:text-red-200 font-medium mt-2 max-w-md">{errorMessage}</p>
                            <Button
                                variant="outline"
                                className="mt-6 border-red-300 text-red-700 hover:bg-red-100"
                                onClick={() => setStatus("idle")}
                            >
                                Coba Gambar Lain
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Success State - Certificate Detail Layout */}
                {status === "success" && result && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 space-y-8 pb-20">
                        {/* Header Status - SLIM VERSION */}
                        <div className={`rounded-xl p-5 flex flex-col md:flex-row items-center justify-between border shadow-glass backdrop-blur-md ${!result.isOwnerMatch
                            ? "bg-amber-500/10 border-amber-400/30 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]"
                            : "bg-emerald-500/10 border-emerald-400/30 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]"
                            }`}>
                            <div className="flex items-center gap-4 mb-3 md:mb-0">
                                <div className={`p-2.5 rounded-xl shadow-md border border-white/20 ${!result.isOwnerMatch ? "bg-amber-500" : "bg-emerald-500"}`}>
                                    {!result.isOwnerMatch ? <ShieldAlert className="h-6 w-6 text-white" /> : <ShieldCheck className="h-6 w-6 text-white" />}
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className={`text-xl font-bold tracking-tight ${result.status === 'TRANSFER_PENDING' || result.status === 'AWAITING_RECIPIENT'
                                        ? "text-blue-900 dark:text-blue-200"
                                        : !result.isOwnerMatch ? "text-amber-900 dark:text-amber-200" : "text-emerald-900 dark:text-emerald-200"
                                        }`}>
                                        {result.status === 'TRANSFER_PENDING' || result.status === 'AWAITING_RECIPIENT'
                                            ? "Proses Pengalihan Hak"
                                            : !result.isOwnerMatch ? "Sertifikat Pindah Tangan" : "Sertifikat Valid & Asli"}
                                    </h2>
                                    <p className={`text-sm font-semibold opacity-90 ${result.status === 'TRANSFER_PENDING' || result.status === 'AWAITING_RECIPIENT'
                                        ? "text-blue-700 dark:text-blue-300"
                                        : !result.isOwnerMatch ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
                                        }`}>
                                        {result.status === 'TRANSFER_PENDING' || result.status === 'AWAITING_RECIPIENT'
                                            ? "ℹ️ Sertifikat ini sedang dalam proses transfer kepemilikan."
                                            : !result.isOwnerMatch
                                                ? "⚠️ Peringatan: Data fisik gambar (stego) sudah lama."
                                                : "✅ Selamat! Integritas data digital terverifikasi sepenuhnya."}
                                    </p>
                                </div>
                            </div>
                            <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm ${result.status === 'TRANSFER_PENDING' || result.status === 'AWAITING_RECIPIENT'
                                ? "bg-blue-600 text-white"
                                : !result.isOwnerMatch
                                    ? "bg-amber-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}>
                                {result.status === 'TRANSFER_PENDING' ? "Transfer Pending"
                                    : result.status === 'AWAITING_RECIPIENT' ? "Awaiting Recipient"
                                        : !result.isOwnerMatch ? "Outdated" : "Verified"}
                            </div>
                        </div>

                        <div className="grid gap-8 md:grid-cols-3">
                            {/* Left Column (2/3): Image & Info */}
                            <div className="md:col-span-2 space-y-8">
                                {/* Certificate Image Card */}
                                <Card className="glass-card border-white/50 overflow-hidden shadow-glass">
                                    <div
                                        className="relative aspect-video w-full cursor-zoom-in bg-slate-900/5"
                                        onClick={() => setImageZoomOpen(true)}
                                    >
                                        {/* Display Uploaded Image */}
                                        {fileUrl ? (
                                            <Image
                                                src={fileUrl}
                                                alt="Uploaded Certificate"
                                                fill
                                                className="object-contain p-2 transition-transform duration-500 hover:scale-[1.02]"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                                <div className="text-center">
                                                    <Upload className="mx-auto mb-2 h-12 w-12 text-zinc-300" />
                                                    <span className="text-sm">Gambar tidak tersedia</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                                            <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-6 py-3 text-white shadow-2xl">
                                                <ZoomIn className="h-5 w-5" />
                                                <span className="text-base font-bold">Tekan untuk Perbesar</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-white/20 bg-white/30 backdrop-blur-sm">
                                        <p className="text-sm text-center font-semibold text-slate-500 tracking-wide uppercase">
                                            Analisis Citra Digital Steganografi
                                        </p>
                                    </div>
                                </Card>

                                {/* Certificate Info Card */}
                                <Card className={`glass-card border-white/50 shadow-glass-lg ${!result.isOwnerMatch ? "border-amber-300/50" : "border-emerald-300/50"}`}>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-800 p-2 rounded-lg">
                                                    <FileText className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-xl font-bold text-slate-900">Hasil Ekstraksi Data</CardTitle>
                                            </div>
                                            {!result.isOwnerMatch && (
                                                <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200 text-xs font-bold animate-pulse shadow-sm">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    OUTDATED DATA
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-8">
                                        {!result.isOwnerMatch && (
                                            <div className="rounded-xl bg-amber-500/15 border-2 border-amber-400/50 p-6 text-amber-950 shadow-sm animate-in zoom-in-95 duration-500">
                                                <div className="flex items-start gap-4">
                                                    <div className="bg-amber-500 p-2 rounded-full shadow-md shrink-0">
                                                        <ShieldAlert className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg leading-tight uppercase tracking-tight">Ketidaksesuaian Kepemilikan Terdeteksi</p>
                                                        <p className="text-sm mt-2 font-medium leading-relaxed opacity-90">
                                                            Data yang tertanam dalam gambar ini mencatat <b className="text-amber-900 h-px bg-amber-200">{result.imageOwnerName}</b> sebagai pemilik.
                                                            Namun, sesuai <b className="text-blue-900">Database Real-time</b>, hak milik sah saat ini dipegang oleh <b className="text-emerald-900">{result.ownerName}</b>.
                                                        </p>
                                                        <div className="mt-4 p-3 bg-white/40 rounded-lg text-xs font-semibold italic border border-amber-300/50">
                                                            Saran: Mintalah salinan sertifikat terbaru dari pemegang hak saat ini.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <div className="space-y-0.5 group">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] group-hover:text-blue-500 transition-colors">Nama Sertifikat</label>
                                                <p className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">{result.nama}</p>
                                            </div>
                                            <div className="space-y-0.5 group">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] group-hover:text-emerald-500 transition-colors">Nomor Sertifikat</label>
                                                <p className="font-mono text-lg text-emerald-600 font-bold tracking-tight">{result.nomor}</p>
                                            </div>
                                            <div className="space-y-0.5 group">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] group-hover:text-blue-500 transition-colors">Luas Tanah</label>
                                                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{result.luas} <span className="text-xs font-medium text-slate-400">m²</span></p>
                                            </div>
                                            <div className="space-y-0.5 group">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] group-hover:text-blue-500 transition-colors">Lokasi Properti</label>
                                                <p className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-blue-600" /> {result.location}
                                                </p>
                                            </div>

                                            {/* Ownership Comparison Section */}
                                            <div className="md:col-span-2 pt-4">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <Separator className="flex-1 bg-white/40" />
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Validasi Kepemilikan</span>
                                                    <Separator className="flex-1 bg-white/40" />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className={`p-4 rounded-xl border transition-all duration-500 shadow-sm ${!result.isOwnerMatch
                                                        ? "bg-slate-100/50 border-slate-300"
                                                        : "bg-emerald-500/10 border-emerald-400/30 ring-2 ring-emerald-500/5"
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className={`p-1.5 rounded-lg ${!result.isOwnerMatch ? "bg-slate-200" : "bg-emerald-500"}`}>
                                                                <ShieldCheck className={`h-3.5 w-3.5 ${!result.isOwnerMatch ? "text-slate-500" : "text-white"}`} />
                                                            </div>
                                                            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Pemilik Sah (Database)</label>
                                                        </div>
                                                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{result.ownerName || "Tidak Diketahui"}</p>
                                                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1.5 bg-white/40 py-1 px-2.5 rounded-full w-fit">
                                                            <User className="h-3 w-3" /> {result.ownerEmail}
                                                        </div>
                                                    </div>

                                                    {!result.isOwnerMatch && (
                                                        <div className="p-4 rounded-xl border border-red-400/50 bg-red-500/10 shadow-[0_0_15px_-5px_rgba(239,68,68,0.1)] animate-in slide-in-from-right-4 duration-500">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="bg-red-500 p-1.5 rounded-lg">
                                                                    <ShieldAlert className="h-3.5 w-3.5 text-white" />
                                                                </div>
                                                                <label className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Data Dalam Gambar</label>
                                                            </div>
                                                            <p className="text-lg font-bold text-red-700">{result.imageOwnerName}</p>
                                                            <div className="text-[10px] font-bold text-red-500 mt-2 flex items-center gap-1.5 uppercase tracking-tight bg-white/40 w-fit px-2.5 py-1 rounded-full border border-red-200/50">
                                                                <AlertCircle className="h-2.5 w-2.5" /> Outdated
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {result.keterangan && (
                                            <div className="pt-6 mt-6 border-t border-white/40 group">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] group-hover:text-blue-500 transition-colors">Informasi Tambahan</label>
                                                <div className="mt-3 p-4 rounded-xl bg-white/30 border border-white/50 text-slate-700 font-medium leading-relaxed italic">
                                                    "{result.keterangan}"
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column (1/3): History Timeline */}
                            <div className="md:col-span-1">
                                <Card className="glass-card border-white/40 shadow-glass sticky top-8">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-600 p-2 rounded-lg">
                                                <History className="h-5 w-5 text-white" />
                                            </div>
                                            <CardTitle className="text-lg font-bold">Audit History</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pl-8 pt-4">
                                        <div className="relative border-l-2 border-slate-300 ml-3 space-y-10 pb-6">
                                            {result.history.length > 0 ? (
                                                result.history.map((h, index) => {
                                                    const isCurrent = index === 0;
                                                    return (
                                                        <div key={index} className="relative pl-8">
                                                            {/* Timeline Dot */}
                                                            <span
                                                                className={`absolute -left-[11px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white shadow-md ${isCurrent ? "bg-blue-600 scale-125 ring-4 ring-blue-500/20" : "bg-slate-300"
                                                                    }`}
                                                            />

                                                            {/* Content */}
                                                            <div className="flex flex-col gap-2">
                                                                <div className="space-y-0.5">
                                                                    <h3 className={`text-base font-bold leading-none ${isCurrent ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-slate-100"}`}>
                                                                        {h.name}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${isCurrent ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                                                            {h.type}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 pt-1">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                                        <span className="truncate max-w-[150px]">{h.email}</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100/50 w-fit px-2 py-1 rounded">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        <span>{h.date}</span>
                                                                    </div>
                                                                </div>

                                                                {h.note && (
                                                                    <div className="mt-2 rounded-xl bg-white/50 border border-white/20 p-3 text-xs text-slate-600 font-semibold italic shadow-sm">
                                                                        "{h.note}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="pr-6 py-10 text-center space-y-4">
                                                    <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                                                        <ShieldAlert className="h-10 w-10 drop-shadow-sm" />
                                                    </div>
                                                    <div className="space-y-2 px-2">
                                                        <p className="text-lg font-bold text-red-700 uppercase tracking-tighter">Data Terproteksi</p>
                                                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                                            Riwayat kepemilikan disembunyikan untuk melindungi privasi pemilik sah saat ini karena gambar yang Anda ajukan sudah tidak valid.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Zoom Modal */}
            <Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-auto h-auto border-none bg-transparent shadow-none p-0 flex items-center justify-center outline-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Preview Certificate</DialogTitle>
                    </DialogHeader>
                    {fileUrl && (
                        <div className="relative flex items-center justify-center outline-none">
                            <button
                                onClick={() => setImageZoomOpen(false)}
                                className="absolute -right-4 -top-4 z-50 rounded-full bg-white/20 backdrop-blur-md border border-white/30 p-2 text-white hover:bg-white/40 transition-all shadow-2xl"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <div className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-white/20">
                                <Image
                                    src={fileUrl}
                                    alt="Full Certificate Preview"
                                    width={1400}
                                    height={1000}
                                    className="max-h-[90vh] w-auto rounded-xl object-contain shadow-2xl shadow-black/50"
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
