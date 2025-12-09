"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Calendar, MapPin, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Dummy Data (Mocking fetching based on ID)
    const transaction = {
        id: id,
        sender: "Budi Santoso",
        receiver: "Ahmad Dahlan",
        type: "Jual Beli",
        date: "2024-12-10",
        status: "Pending",
        certificate: {
            title: "Hak Milik No. 123",
            noSertifikat: "SERT-2024-001",
            image: "https://placehold.co/800x600/png?text=Certificate+Preview",
            location: "Jl. Merdeka No. 10, Jakarta Pusat",
            area: "500 m2",
            owner: "Budi Santoso",
        },
        history: [
            { date: "2022-05-20", owner: "Budi Santoso", method: "Jual Beli", notes: "Pembelian dari Pemerintah" },
            { date: "2020-01-15", owner: "Pemerintah DKI", method: "Ajudikasi", notes: "Penerbitan Pertama" },
        ],
    };

    const handleAction = async (action: "approve" | "reject") => {
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            router.push("/admin/persetujuan");
        }, 1500);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-4 pb-4">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-background" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Detail Pengajuan</h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{transaction.id}</span>
                        <span>•</span>
                        <span>Diajukan pada {transaction.date}</span>
                    </p>
                </div>
                <div className="ml-auto">
                    <Badge variant="outline" className="px-3 py-1 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 capitalize">
                        {transaction.status}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content (Left Column) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Transaction Details */}
                    <Card className="shadow-sm border-muted/60">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Informasi Transaksi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercas">Pengirim (Pemilik Lama)</p>
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg dark:bg-blue-900/30 dark:text-blue-400">
                                        {transaction.sender.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">{transaction.sender}</p>
                                        <p className="text-xs text-muted-foreground">ID: USER-8821</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Penerima (Pemilik Baru)</p>
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg dark:bg-purple-900/30 dark:text-purple-400">
                                        {transaction.receiver.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">{transaction.receiver}</p>
                                        <p className="text-xs text-muted-foreground">ID: USER-9932</p>
                                    </div>
                                </div>
                            </div>
                            <Separator className="sm:col-span-2" />
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Jenis Perpindahan</p>
                                <p className="font-medium">{transaction.type}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Tanggal Pengajuan</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{transaction.date}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Certificate Details */}
                    <Card className="shadow-sm border-muted/60 overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                Objek Sertifikat
                            </CardTitle>
                        </CardHeader>
                        <div className="aspect-[2/1] w-full bg-muted relative group overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button variant="secondary" size="sm">Lihat Gambar Penuh</Button>
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={transaction.certificate.image} alt="Sertifikat" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Judul Sertifikat</p>
                                <p className="font-semibold">{transaction.certificate.title}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Nomor Sertifikat</p>
                                <p className="font-mono text-sm">{transaction.certificate.noSertifikat}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Lokasi Aset</p>
                                <div className="flex items-start gap-2 mt-1">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-sm">{transaction.certificate.location}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Luas Area</p>
                                <p>{transaction.certificate.area}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="space-y-6">
                    {/* Action Card */}
                    <Card className="border-l-4 border-l-blue-600 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Tindakan Diperlukan</CardTitle>
                            <CardDescription>
                                Tinjau data dengan seksama sebelum mengambil keputusan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-sm" size="lg">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Setujui Pengajuan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Konfirmasi Persetujuan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Anda akan menyetujui perpindahan hak dari <b>{transaction.sender}</b> ke <b>{transaction.receiver}</b>. Tindakan ini akan tercatat dalam blockchain dan tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Periksa Lagi</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction("approve")} className="bg-emerald-600 hover:bg-emerald-700">
                                            Ya, Saya Yakin
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" size="lg">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Tolak Pengajuan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Konfirmasi Penolakan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Pengajuan ini akan ditolak dan dikembalikan ke pemohon. Harap berikan alasan penolakan jika diperlukan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction("reject")} className="bg-destructive hover:bg-destructive/90">
                                            Ya, Tolak
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>

                    {/* Ownership History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Riwayat Kepemilikan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[300px] px-6 pb-6">
                                <div className="space-y-6">
                                    {transaction.history.map((hist, i) => (
                                        <div key={i} className="relative pl-6 border-l-2 border-muted last:border-l-0 pb-1">
                                            <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-muted-foreground">{hist.date}</span>
                                                <p className="font-semibold text-sm">{hist.owner}</p>
                                                <Badge variant="secondary" className="w-fit text-[10px] h-5">{hist.method}</Badge>
                                                <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">{hist.notes}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
