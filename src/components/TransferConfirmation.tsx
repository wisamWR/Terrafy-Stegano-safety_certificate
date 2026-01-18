"use client";

import { useState } from "react";
import { acceptTransfer, rejectTransfer } from "@/lib/actions/certificates";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TransferConfirmationProps {
    certId: string;
    certName: string;
}

export function TransferConfirmation({ certId, certName }: TransferConfirmationProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [successType, setSuccessType] = useState<'accepted' | 'rejected' | null>(null);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleAccept = async () => {
        setIsProcessing(true);
        const result = await acceptTransfer(certId);
        if (result.success) {
            setSuccessType('accepted');
            setOpen(true);
            window.dispatchEvent(new Event("refresh-notifications"));
        } else {
            alert(result.error || "Gagal menyetujui transfer");
        }
        setIsProcessing(false);
    };

    const handleReject = async () => {
        setIsProcessing(true);
        const result = await rejectTransfer(certId);
        if (result.success) {
            setSuccessType('rejected');
            setOpen(true);
            window.dispatchEvent(new Event("refresh-notifications"));
        } else {
            alert(result.error || "Gagal menolak transfer");
        }
        setIsProcessing(false);
    };

    const handleClose = () => {
        setOpen(false);
        router.refresh();
    };

    return (
        <>
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-900">Konfirmasi Penerimaan Aset</h4>
                    <p className="text-xs text-blue-700">
                        Anda menerima permintaan pengalihan hak untuk sertifikat <b>{certName}</b>.
                        Apakah Anda ingin menerima aset ini?
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Setujui
                    </Button>
                    <Button
                        onClick={handleReject}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-100"
                        size="sm"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Tolak
                    </Button>
                </div>
            </div>

            <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center">
                        <div className={`rounded-full p-3 mb-4 ${successType === 'accepted' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            {successType === 'accepted' ? (
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            ) : (
                                <XCircle className="h-10 w-10 text-red-600" />
                            )}
                        </div>
                        <DialogTitle className="text-xl">
                            {successType === 'accepted' ? 'Berhasil Disetujui' : 'Berhasil Ditolak'}
                        </DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            {successType === 'accepted'
                                ? "Permintaan transfer telah disetujui. Menunggu verifikasi akhir oleh Admin."
                                : "Permintaan transfer telah ditolak. Sertifikat akan kembali ke pemilik asal."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={handleClose} className="w-full sm:w-auto min-w-[120px]">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
