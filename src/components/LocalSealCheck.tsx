"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Info, Loader2, Lock, ShieldCheck, ShieldX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { checkSealLocally, type LocalVerdict } from "@/lib/seal/local-check"

const INVALID_TEXT: Record<Extract<LocalVerdict, { state: "invalid" }>["reason"], string> = {
    bad_signature: "Tanda tangan digital tidak cocok. Gambar ini telah diubah atau tidak diterbitkan oleh Terrafy.",
    unknown_kid: "Gambar ditandatangani dengan kunci yang tidak dikenal Terrafy.",
    revoked_kid: "Kunci penanda tangan sertifikat ini telah dicabut.",
    malformed: "Data segel di dalam gambar rusak.",
}

/** Offline authenticity check: runs entirely in the browser, the image is never uploaded. */
export function LocalSealCheck({ file }: { file: File }) {
    // The verdict is tied to the file it was computed for, so a new file shows "checking" immediately
    const [checked, setChecked] = useState<{ file: File; verdict: LocalVerdict } | null>(null)
    const verdict = checked?.file === file ? checked.verdict : null

    useEffect(() => {
        let cancelled = false
        file.arrayBuffer()
            // decode is synchronous: let the "checking" state paint before it runs
            .then((buffer) => new Promise<ArrayBuffer | null>((resolve) => requestAnimationFrame(() => setTimeout(() => resolve(cancelled ? null : buffer), 0))))
            .then((buffer) => (buffer ? checkSealLocally(new Uint8Array(buffer)) : null))
            .then((v) => { if (v && !cancelled) setChecked({ file, verdict: v }) })
            .catch(() => { if (!cancelled) setChecked({ file, verdict: { state: "unsupported" } }) })
        return () => { cancelled = true }
    }, [file])

    const view = (() => {
        if (!verdict) return { tone: "border-slate-200 bg-white/60", icon: <Loader2 className="h-6 w-6 animate-spin text-slate-500" />, title: "Memeriksa tanda tangan digital…", body: "" }
        switch (verdict.state) {
            case "valid":
                return {
                    tone: "border-emerald-300 bg-emerald-500/10",
                    icon: <ShieldCheck className="h-6 w-6 text-emerald-600" />,
                    title: "Tanda tangan digital valid",
                    body: `Diterbitkan ${verdict.issuer} · No. ${verdict.serial} · ${new Date(verdict.issuedAt).toLocaleDateString("id-ID", { dateStyle: "long" })} · kunci ${verdict.kid}. Keaslian segel terverifikasi; untuk status kepemilikan terkini gunakan Cek Status Online.`,
                }
            case "invalid":
                return { tone: "border-red-300 bg-red-500/10", icon: <ShieldX className="h-6 w-6 text-red-600" />, title: "Tanda tangan digital tidak valid", body: INVALID_TEXT[verdict.reason] }
            case "legacy":
                return { tone: "border-blue-300 bg-blue-500/10", icon: <Info className="h-6 w-6 text-blue-600" />, title: "Segel lama (tanpa tanda tangan digital)", body: "Sertifikat ini diterbitkan sebelum tanda tangan digital diterapkan. Gunakan Cek Status Online untuk memverifikasinya." }
            case "unavailable":
                return { tone: "border-slate-300 bg-slate-500/10", icon: <Info className="h-6 w-6 text-slate-600" />, title: "Pemeriksaan offline tidak tersedia di browser ini", body: "Browser tidak menyediakan fitur kriptografi yang dibutuhkan (halaman harus dibuka lewat HTTPS). Gunakan Cek Status Online." }
            case "none":
                return { tone: "border-amber-300 bg-amber-500/10", icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, title: "Segel Terrafy tidak ditemukan", body: "Gambar mungkin bukan sertifikat Terrafy, terlalu besar, atau sudah dikompresi ulang (JPEG, screenshot, aplikasi chat). Coba Cek Status Online dengan file asli." }
            case "unsupported":
                return { tone: "border-amber-300 bg-amber-500/10", icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, title: "Tidak dapat diperiksa secara offline", body: "Format atau ukuran gambar tidak didukung pemeriksa offline (misalnya bukan PNG, terlalu besar, atau sudah dikompresi ulang). Gunakan Cek Status Online dengan file asli." }
            default: {
                const _exhaustive: never = verdict
                return _exhaustive
            }
        }
    })()

    return (
        <Card role="status" aria-live="polite" aria-busy={!verdict} className={`glass-card border ${view.tone} animate-in fade-in`}>
            <CardContent className="flex items-start gap-4 py-5">
                <div className="mt-0.5 shrink-0">{view.icon}</div>
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{view.title}</h3>
                        <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                            <Lock className="h-3 w-3" /> Diperiksa di perangkat Anda — gambar tidak diunggah
                        </Badge>
                    </div>
                    {view.body && <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{view.body}</p>}
                </div>
            </CardContent>
        </Card>
    )
}
