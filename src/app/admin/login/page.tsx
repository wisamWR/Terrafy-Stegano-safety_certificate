"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Simulate API call
        setTimeout(() => {
            if (formData.username === "admin" && formData.password === "admin") {
                // Set dummy cookie
                document.cookie = "admin_session=true; path=/; max-age=86400"; // 1 day
                router.push("/admin/dashboard");
                router.refresh(); // Refresh to let middleware know
            } else {
                setError("Username atau password salah");
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto w-[350px] space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
                        <p className="text-sm text-muted-foreground">
                            Masukan kredensial untuk mengakses dashboard
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                                <Input
                                    id="username"
                                    placeholder="admin"
                                    className="pl-8"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                                <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-8"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Sistem Keamanan Terintegrasi
                    </p>
                </div>
            </div>
            <div className="hidden bg-muted lg:block relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 opacity-90 mix-blend-multiply" />
                <div className="absolute inset-0 flex items-center justify-center p-12 text-white">
                    <div className="space-y-6 max-w-lg z-10">
                        <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl relative">
                            <Image
                                src="/logo.png"
                                alt="Terrafy Logo"
                                fill
                                className="object-contain p-4"
                            />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                            Terrafy Admin
                        </h1>
                        <p className="text-lg text-zinc-200">
                            Platform aman untuk validasi dan manajemen perpindahan hak kepemilikan sertifikat digital dengan teknologi enkripsi mutakhir.
                        </p>
                    </div>
                </div>

                {/* Abstract shapes */}
                <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500 blur-3xl opacity-30 animate-pulse" />
                <div className="absolute bottom-12 left-12 h-64 w-64 rounded-full bg-purple-500 blur-3xl opacity-30" />
            </div>
        </div>
    );
}
