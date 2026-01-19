"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send, AlertTriangle, Loader2, CheckCircle2, XCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestTransfer } from "@/lib/actions/certificates"
import { checkUserByEmail } from "@/lib/actions/users"

interface TransferModalProps {
    certId: string;
    certName: string;
    currentUserEmail?: string;
}

export function TransferModal({ certId, certName, currentUserEmail }: TransferModalProps) {
    const [email, setEmail] = useState("")
    const [reason, setReason] = useState<string>("")
    const [recipientName, setRecipientName] = useState<string | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [checkStatus, setCheckStatus] = useState<'idle' | 'valid' | 'invalid' | 'self'>('idle')
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const [isSuccess, setIsSuccess] = useState(false)

    const handleCheckUser = async () => {
        if (!email) return;

        if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
            setCheckStatus('self');
            return;
        }

        setIsChecking(true);
        setRecipientName(null);
        setCheckStatus('idle');

        const result = await checkUserByEmail(email);

        setIsChecking(false);
        if (result.success && result.user) {
            setRecipientName(result.user.name || "Tanpa Nama");
            setCheckStatus('valid');
        } else {
            setCheckStatus('invalid');
        }
    };

    const handleTransfer = async () => {
        if (!email || checkStatus !== 'valid') {
            alert("Silakan validasi email penerima terlebih dahulu")
            return
        }

        if (!reason) {
            alert("Silakan pilih tujuan/skenario transfer")
            return
        }

        setIsLoading(true)
        try {
            const result = await requestTransfer(certId, email, reason)
            if (result.success) {
                setIsSuccess(true) // Show success view
                // router.refresh() is moved to handleClose to prevent immediate unmounting
            } else {
                alert(result.error || "Gagal melakukan transfer")
                setIsLoading(false)
            }
        } catch (error) {
            alert("Terjadi kesalahan sistem")
            setIsLoading(false)
        }
    }

    // Reset status when email changes
    const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (checkStatus !== 'idle') {
            setCheckStatus('idle');
            setRecipientName(null);
        }
    }

    const handleClose = () => {
        setOpen(false)
        if (isSuccess) {
            router.refresh()
        }
        setIsSuccess(false) // Reset for next time
        setEmail("")
        setReason("")
        setCheckStatus('idle')
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                    <Send className="h-4 w-4" />
                    Pindahkan Hak (Transfer)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-8">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
                        <div className="rounded-full bg-amber-100 p-4 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-12 w-12 text-amber-600" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-bold text-zinc-900">Permohonan Terkirim!</DialogTitle>
                            <DialogDescription className="text-lg text-zinc-600 max-w-md mx-auto">
                                Permintaan transfer ke <strong>{recipientName}</strong> ({email}) untuk keperluan <strong>{reason}</strong> sedang diproses.
                            </DialogDescription>
                        </div>

                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 max-w-lg w-full text-left space-y-4">
                            <h4 className="font-semibold text-zinc-900 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                Status: Menunggu Konfirmasi
                            </h4>
                            <div className="space-y-3">
                                <p className="text-sm text-zinc-600 flex gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold">1</span>
                                    <span>Penerima menyetujui permintaan transfer.</span>
                                </p>
                                <p className="text-sm text-zinc-600 flex gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold">2</span>
                                    <span>Admin memverifikasi perpindahan aset.</span>
                                </p>
                                <p className="text-sm text-zinc-600 flex gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold">3</span>
                                    <span>Hak kepemilikan resmi berpindah.</span>
                                </p>
                            </div>
                        </div>

                        <Button onClick={handleClose} className="w-full max-w-xs h-12 text-base">
                            Tutup & Kembali
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="space-y-4">
                            <DialogTitle className="text-2xl font-bold text-center">Transfer Kepemilikan</DialogTitle>
                            <DialogDescription className="text-center text-lg text-zinc-600">
                                Anda akan memindahkan hak milik sertifikat <strong>{certName}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-8 py-8">
                            <div className="rounded-xl bg-amber-500/10 p-6 border-2 border-amber-300 shadow-sm flex gap-4 items-start animate-in fade-in zoom-in-95 duration-300">
                                <div className="rounded-full bg-amber-500 p-2 shrink-0 shadow-md">
                                    <AlertTriangle className="h-6 w-6 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-amber-900 text-lg tracking-tight">Peringatan Penting</p>
                                    <p className="text-base text-amber-950 leading-relaxed font-medium">
                                        Proses ini tidak dapat dibatalkan sepihak. Setelah penerima menyetujui dan Admin memverifikasi,
                                        <strong className="text-red-700 underline decoration-red-300 underline-offset-4"> hak akses Anda terhadap sertifikat ini akan dicabut sepenuhnya</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="email" className="text-lg font-medium text-zinc-900">
                                    Email Penerima
                                </Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="email"
                                        placeholder="nama@email.com"
                                        type="email"
                                        value={email}
                                        onChange={onEmailChange}
                                        disabled={isLoading}
                                        className="h-14 text-lg px-4 bg-zinc-50 border-zinc-300 focus:border-zinc-500 focus:ring-0 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleCheckUser}
                                        disabled={isChecking || !email}
                                        className={`h-14 px-6 text-base font-medium transition-all ${checkStatus === 'valid' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                            checkStatus === 'invalid' || checkStatus === 'self' ? 'bg-red-600 hover:bg-red-700' :
                                                'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                                            }`}
                                    >
                                        {isChecking ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                            checkStatus === 'valid' ? <CheckCircle2 className="h-6 w-6 text-white" /> :
                                                checkStatus === 'invalid' || checkStatus === 'self' ? <XCircle className="h-6 w-6 text-white" /> :
                                                    <Search className="h-5 w-5" />}
                                    </Button>
                                </div>

                                {/* Validation Status Message */}
                                {checkStatus === 'valid' && (
                                    <div className="flex items-center gap-2 text-emerald-800 bg-emerald-500/15 p-3 rounded-md border-2 border-emerald-400 animate-in fade-in slide-in-from-top-1 shadow-sm">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        <span className="font-bold">Akun Ditemukan: {recipientName}</span>
                                    </div>
                                )}
                                {checkStatus === 'invalid' && (
                                    <div className="flex items-center gap-2 text-red-800 bg-red-500/15 p-3 rounded-md border-2 border-red-400 animate-in fade-in slide-in-from-top-1 shadow-sm">
                                        <XCircle className="h-5 w-5 text-red-600" />
                                        <span className="font-bold">Pengguna dengan email tersebut tidak ditemukan.</span>
                                    </div>
                                )}
                                {checkStatus === 'self' && (
                                    <div className="flex items-center gap-2 text-amber-900 bg-amber-500/15 p-3 rounded-md border-2 border-amber-400 animate-in fade-in slide-in-from-top-1 shadow-sm">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        <span className="font-bold">Anda tidak dapat mengirim ke akun sendiri.</span>
                                    </div>
                                )}
                                {checkStatus === 'idle' && (
                                    <p className="text-sm text-zinc-500">
                                        Klik tombol cari untuk memverifikasi penerima sebelum mengirim.
                                    </p>
                                )}
                            </div>

                            {/* Dropdown Alasan Transfer */}
                            <div className="space-y-2">
                                <Label htmlFor="reason" className="text-lg font-medium text-zinc-900">
                                    Tujuan Transfer
                                </Label>
                                <select
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={isLoading}
                                    className="h-14 w-full rounded-md border border-zinc-300 bg-zinc-50 px-4 text-lg text-zinc-900 focus:border-zinc-500 focus:ring-0"
                                >
                                    <option value="" disabled>Pilih Tujuan Transfer...</option>
                                    <option value="Jual Beli">Jual Beli</option>
                                    <option value="Warisan">Warisan</option>
                                    <option value="Wakaf">Wakaf</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={isLoading || checkStatus !== 'valid' || !reason}
                                onClick={handleTransfer}
                                className="w-full h-14 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                        Memproses Transfer...
                                    </>
                                ) : (
                                    "Kirim Permohonan Transfer"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
