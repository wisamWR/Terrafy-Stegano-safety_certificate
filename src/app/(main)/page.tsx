"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Loader2, Plus, Upload, CheckCircle, Settings, ChevronRight, FileText, ZoomIn, Search, Filter, RefreshCw, AlertCircle, Trash2, X, ShieldCheck, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCertificate, getUserCertificates, deleteCertificate } from "@/lib/actions/certificates";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/HeroSection";



export default function Home() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageZoomOpen, setImageZoomOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [duplicateErrorOpen, setDuplicateErrorOpen] = useState(false);

    // Upload & Delete State
    const [isUploading, setIsUploading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [certToDelete, setCertToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        namaSertifikat: "",
        nomorSertifikat: "",
        namaPemegang: "",
        luasTanah: "",
        alamat: "",
        keterangan: "",
        asalHak: ""
    });

    useEffect(() => {
        const session = localStorage.getItem("auth_session");
        if (session) {
            const user = JSON.parse(session);
            setCurrentUser(user);
            setFormData(prev => ({ ...prev, namaPemegang: user.name || "" }));

            // Load Certificates from DB
            loadCertificates();
        }
    }, []);

    const loadCertificates = async () => {
        const result = await getUserCertificates();
        if (result.success && result.certificates) {
            setCertificates(result.certificates);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const processFile = (file: File) => {
        console.log("File selected:", file);
        setUploadedFile(file);

        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        setIsUploadOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        const submitData = new FormData();
        submitData.append("nomorSertifikat", formData.nomorSertifikat);
        submitData.append("namaSertifikat", formData.namaSertifikat);
        submitData.append("namaPemegang", formData.namaPemegang); // Ensure namaPemegang is included
        submitData.append("luasTanah", formData.luasTanah);
        submitData.append("alamat", formData.alamat);
        submitData.append("keterangan", formData.keterangan);
        submitData.append("asalHak", (formData as any).asalHak || "");

        // Add defaults/missing from UI but required by Schema

        if (uploadedFile) {
            submitData.append("file", uploadedFile);
        }

        const result = await createCertificate(submitData);

        console.log("Create Certificate Result:", result); // Debugging
        setIsUploading(false);

        if (result.success) {
            loadCertificates(); // Refresh list
            setIsUploadOpen(false);
            setSuccessOpen(true); // Open success modal
            setUploadedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            // Reset form but keep owner name
            setFormData({
                namaSertifikat: "",
                nomorSertifikat: "",
                namaPemegang: currentUser?.name || "",
                luasTanah: "",
                alamat: "",
                keterangan: "",
                asalHak: ""
            });
            window.dispatchEvent(new Event("refresh-notifications")); // Sync notifications
            router.refresh(); /* Wait for router refresh might be okay, but event is faster */
        } else {
            // Check for DUPLICATE_NUMBER or if the error message contains "duplicate" (case insensitive)
            const errorString = typeof result.error === 'string' ? result.error.toLowerCase() : '';
            if (result.error === "DUPLICATE_NUMBER" || errorString.includes('duplicate') || errorString.includes('unique constraint')) {
                setDuplicateErrorOpen(true);
            } else {
                alert(result.error);
            }
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, cert: any) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();
        setCertToDelete(cert);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!certToDelete) return;
        setIsDeleting(true);
        const result = await deleteCertificate(certToDelete.id);
        setIsDeleting(false);
        setDeleteDialogOpen(false);

        if (result.success) {
            loadCertificates(); // Refresh list
            router.refresh();
        } else {
            alert(result.error || "Gagal menghapus sertifikat");
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <HeroSection onUploadClick={handleUploadClick} />

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/png"
            />

            {/* Certificates Section */}
            <div className="container mx-auto max-w-6xl px-4 md:px-8 pb-20">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Sertifikat Terbaru</h2>
                        <p className="text-slate-600 mt-1">Kelola dan pantau sertifikat Anda</p>
                    </div>
                    <Link href="/sertifikat">
                        <Button variant="ghost" className="glass-card glass-hover border-white/30">
                            Lihat Semua <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {/* Certificate List */}
                <div className="grid gap-6 md:grid-cols-2">
                    {certificates.slice(0, 4).map((c) => {
                        const isRejected = c.status === 'REJECTED';
                        return (
                            <Link key={c.id} href={`/sertifikat/${c.id}`}>
                                <Card className={`glass-card glass-hover h-full cursor-pointer border-white/40 shadow-glass transition-all duration-300
                                     ${c.status === 'PENDING' ? 'border-amber-400/30 bg-amber-400/5 shadow-[0_0_15px_-5px_rgba(251,191,36,0.2)] hover:border-amber-400' :
                                        isRejected ? 'border-red-400/30 bg-red-400/5 shadow-[0_0_15px_-5px_rgba(248,113,113,0.2)] hover:border-red-400' :
                                            'border-emerald-400/30 bg-emerald-400/5 shadow-[0_0_15px_-5px_rgba(52,211,153,0.1)] hover:border-emerald-400'}`}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className={`text-xl font-bold tracking-tight transition-colors ${isRejected ? 'text-red-900 group-hover:text-red-700' :
                                                    c.status === 'PENDING' ? 'text-amber-900 group-hover:text-amber-700' :
                                                        'text-emerald-950 group-hover:text-emerald-700'}`}>
                                                {c.nama_lahan}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                {isRejected && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:bg-red-200 hover:text-red-800"
                                                        onClick={(e) => handleDeleteClick(e, c)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {c.status === 'PENDING' && (
                                                    <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                                                        <Clock className="mr-1 h-3 w-3" />
                                                        Pending
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center rounded-full border border-red-300/50 bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                                                        <AlertCircle className="mr-1 h-3 w-3" />
                                                        Ditolak
                                                    </span>
                                                )}
                                                {c.status === 'VERIFIED' && (
                                                    <span className="inline-flex items-center rounded-full border border-emerald-300/50 bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                                                        <ShieldCheck className="mr-1 h-3 w-3" />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="text-zinc-500 font-mono text-xs">
                                            {c.nomor_sertifikat}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 gap-y-2 text-sm text-zinc-600 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                                            <div className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Alamat :</div>
                                            <div className="font-semibold text-zinc-900 line-clamp-1">
                                                {c.lokasi}
                                            </div>

                                            <div className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Luas :</div>
                                            <div className="font-semibold text-zinc-900">{c.luas_tanah}</div>

                                            <div className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Tanggal :</div>
                                            <div className="font-semibold text-zinc-900">
                                                {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>

                                            {isRejected && c.rejectionReason && (
                                                <div className="col-span-1 sm:col-span-2 mt-3 rounded-lg bg-red-500/5 border border-red-200/50 p-2.5 text-[11px] italic text-red-700 font-medium">
                                                    " {c.rejectionReason} "
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Upload Dialog */}
            <Dialog
                open={isUploadOpen}
                onOpenChange={(open) => {
                    // Prevent closing the dialog if the zoom modal is open
                    if (!open && imageZoomOpen) return;
                    setIsUploadOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Sertifikat Baru</DialogTitle>
                        <DialogDescription>
                            Lengkapi informasi sertifikat untuk dokumen yang baru saja diunggah.
                        </DialogDescription>
                    </DialogHeader>

                    {previewUrl && (
                        <div className="mb-6 space-y-3">
                            <div
                                className="relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg border bg-zinc-100 dark:bg-zinc-800"
                                onClick={() => setImageZoomOpen(true)}
                            >
                                <Image
                                    src={previewUrl}
                                    alt="Preview Sertifikat"
                                    fill
                                    className="object-cover transition-transform hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                                    <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-white">
                                        <ZoomIn className="h-4 w-4" />
                                        <span className="text-xs font-medium">Perbesar</span>
                                    </div>
                                </div>
                            </div>

                            {uploadedFile && (
                                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100 text-blue-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="no-sertif">Nomor Sertifikat</Label>
                                <Input
                                    id="no-sertif"
                                    placeholder="XXX/SRTV/X/YYYY"
                                    required
                                    value={formData.nomorSertifikat}
                                    onChange={(e) => setFormData({ ...formData, nomorSertifikat: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nama-sertif">Nama Sertifikat</Label>
                                <Input
                                    id="nama-sertif"
                                    placeholder="Contoh: Tanah Warisan"
                                    required
                                    value={formData.namaSertifikat}
                                    onChange={(e) => setFormData({ ...formData, namaSertifikat: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="pemegang">Nama Pemegang Hak</Label>
                            <Input
                                id="pemegang"
                                placeholder="Nama Lengkap"
                                required
                                value={formData.namaPemegang}
                                onChange={(e) => setFormData({ ...formData, namaPemegang: e.target.value })}
                            />
                        </div>



                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="luas">Luas Tanah</Label>
                                <div className="relative">
                                    <Input
                                        id="luas"
                                        type="number"
                                        placeholder="500"
                                        required
                                        min="1"
                                        value={formData.luasTanah}
                                        onChange={(e) => setFormData({ ...formData, luasTanah: e.target.value })}
                                        className="pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white pl-1">
                                        m²
                                    </span>
                                </div>
                                </div>
                            <div className="grid gap-2">
                                <Label htmlFor="asal-hak">Asal Hak</Label>
                                <Select 
                                    onValueChange={(value) => setFormData({ ...formData, asalHak: value })}
                                    value={(formData as any).asalHak || ""}
                                >
                                    <SelectTrigger id="asal-hak">
                                        <SelectValue placeholder="Pilih Asal Hak" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Jual Beli">Jual Beli</SelectItem>
                                        <SelectItem value="Warisan">Warisan</SelectItem>
                                        <SelectItem value="Wakaf">Wakaf</SelectItem>
                                        <SelectItem value="Hibah">Hibah</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="alamat">Alamat Lokasi</Label>
                                <Input
                                    id="alamat"
                                    placeholder="Jalan..."
                                    required
                                    value={formData.alamat}
                                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="keterangan">Keterangan</Label>
                            <Textarea
                                id="keterangan"
                                placeholder="Deskripsi tambahan..."
                                value={formData.keterangan}
                                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                            />
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Batal</Button>
                            <Button type="submit">Simpan Sertifikat</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            {/* Error Duplicate Modal */}
            < Dialog open={duplicateErrorOpen} onOpenChange={setDuplicateErrorOpen} >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <X className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold">Gagal Mengunggah</DialogTitle>
                        <DialogDescription className="text-center text-zinc-500">
                            Nomor sertifikat <strong>{formData.nomorSertifikat}</strong> sudah terdaftar di sistem.
                            <br />
                            Mohon periksa kembali nomor sertifikat Anda.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 sm:justify-center">
                        <Button
                            variant="destructive"
                            onClick={() => setDuplicateErrorOpen(false)}
                            className="w-full sm:w-auto px-8"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Image Zoom Modal */}
            < Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen} >
                <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-auto h-auto border-none bg-transparent shadow-none p-0 flex items-center justify-center outline-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Preview Images</DialogTitle>
                    </DialogHeader>
                    {previewUrl && (
                        <div className="relative flex items-center justify-center outline-none">
                            <button
                                onClick={() => setImageZoomOpen(false)}
                                className="absolute -right-4 -top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <Image
                                src={previewUrl}
                                alt="Full Preview"
                                width={1200}
                                height={800}
                                className="max-h-[85vh] w-auto rounded-md object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog >

            {/* Success Modal */}
            < Dialog open={successOpen} onOpenChange={setSuccessOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="h-6 w-6" />
                            Berhasil Diunggah
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Sertifikat Anda telah berhasil diunggah dan saat ini sedang <b>menunggu verifikasi admin</b>.
                            <br /><br />
                            Anda dapat memantau status sertifikat pada halaman utama. Notifikasi akan dikirim setelah verifikasi selesai.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setSuccessOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Delete Confirmation Alert */}
            < AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Sertifikat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah anda yakin ingin menghapus sertifikat <b>{certToDelete?.nama_lahan}</b> yang ditolak ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
