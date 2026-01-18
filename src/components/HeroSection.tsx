"use client";

import { Upload, ShieldCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeroSectionProps {
    onUploadClick: () => void;
}

export function HeroSection({ onUploadClick }: HeroSectionProps) {
    return (
        <section className="relative py-20 px-4 md:px-8">
            <div className="container mx-auto max-w-6xl">
                {/* Hero Content */}
                <div className="text-center space-y-6 mb-16">
                    <div className="inline-block">
                        <span className="text-sm font-semibold text-cyan-600 bg-cyan-50 px-4 py-2 rounded-full border border-cyan-200">
                            🔒 Digital Land Certificate Security
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-gradient-hero leading-[1.2] py-2">
                        Amankan Sertifikat Tanah Anda
                        <br />
                        dengan Kriptografi & Steganografi Digital
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
                        Kelola sertifikat tanah digital Anda dengan aman menggunakan teknologi keamanan tingkat tinggi
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Button
                            onClick={onUploadClick}
                            size="lg"
                            className="btn-gradient-primary px-8 py-6 text-lg gap-2 min-w-[200px]"
                        >
                            <Upload className="h-5 w-5" />
                            Unggah Sertifikat
                        </Button>
                        <Link href="/verifikasi">
                            <Button
                                size="lg"
                                variant="outline"
                                className="px-8 py-6 text-lg gap-2 glass-card glass-hover border-white/30 min-w-[200px]"
                            >
                                <ShieldCheck className="h-5 w-5" />
                                Verifikasi Sertifikat
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Upload Card */}
                    <div
                        onClick={onUploadClick}
                        className="glass-card glass-hover rounded-2xl p-8 group cursor-pointer active:scale-95 transition-all"
                    >
                        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                            <Upload className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">Upload Sertifikat</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">
                            Daftarkan hak milik watermark steganografi-kriptografi
                        </p>
                        <div className="space-y-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <span>Detail Akurat</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <span>Verifikasi Cepat</span>
                            </div>
                        </div>
                    </div>

                    {/* Verify Card */}
                    <Link href="/verifikasi" className="block outline-none">
                        <div className="glass-card glass-hover rounded-2xl p-8 group cursor-pointer h-full active:scale-95 transition-all">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Verifikasi Sertifikat</h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                Integrity Check: Pastikan keaslian sertifikat Anda secara instan
                            </p>
                            <div className="space-y-2 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span>Ekstraksi Data</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span>Audit History</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Settings Card */}
                    <Link href="/pengaturan" className="block outline-none">
                        <div className="glass-card glass-hover rounded-2xl p-8 group cursor-pointer h-full active:scale-95 transition-all">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                <Settings className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Pengaturan</h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                Kelola akun, keamanan, dan preferensi profil Anda
                            </p>
                            <div className="space-y-2 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    <span>Profil Pengguna</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    <span>Keamanan Akun</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}
