"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser, registerUser } from "@/lib/actions/auth";


interface User {
  name?: string;
  email: string;
  password?: string;
}

export default function AuthPage({ initialSignUp = false }: { initialSignUp?: boolean }) {
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const router = useRouter();

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setMessage(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name || !email || !password) {
      setMessage({ type: "error", text: "Semua kolom harus diisi" });
      return;
    }

    const result = await registerUser({ name, email, password });

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: "Akun berhasil dibuat! Silakan masuk." });
      setTimeout(() => {
        toggleMode();
      }, 1500);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: "error", text: "Email dan password harus diisi" });
      return;
    }

    const result = await loginUser({ email, password });

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      // Simpan di localStorage hanya untuk sinkronisasi Navbar/UI jika diperlukan
      localStorage.setItem("auth_session", JSON.stringify(result.user));

      // Dispatch custom event for Navbar update
      window.dispatchEvent(new Event("auth-change"));

      setMessage({ type: "success", text: "Login berhasil! Mengalihkan..." });
      setTimeout(() => {
        router.push("/");
        router.refresh(); // Refresh to update server-side state
      }, 1000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 overflow-hidden" suppressHydrationWarning>
      <div className="relative w-full max-w-[850px] min-h-[550px] bg-white rounded-[20px] shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* Sign In Form Container */}
        <div className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out z-20 ${isSignUp ? "md:translate-x-full opacity-0 pointer-events-none" : "opacity-100"}`}>
          <FormContainer title={isForgotPassword ? "Reset Password" : "Sign In"} description={isForgotPassword ? "Masukkan email Anda" : "Akses brankas sertifikat digital Anda yang telah diamankan."}>
            <AnimatePresence mode="wait">
              {!isForgotPassword ? (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 w-full max-w-xs mx-auto"
                  onSubmit={handleSignIn}
                >
                  {message && !isSignUp && (
                    <div className={`text-xs p-2 rounded ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {message.text}
                    </div>
                  )}
                  <div className="grid gap-2 text-left">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 text-left">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full mt-2 bg-zinc-900 hover:bg-zinc-800 text-white">Sign In</Button>
                  <div className="text-center mt-2">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline">
                      Forgot your password?
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 w-full max-w-xs mx-auto"
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Mock submit
                    alert("Reset link sent!");
                    setIsForgotPassword(false);
                  }}
                >
                  <div className="grid gap-2 text-left">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input id="reset-email" type="email" placeholder="m@example.com" required />
                  </div>
                  <Button className="w-full mt-2 bg-zinc-900 hover:bg-zinc-800 text-white">Send Reset Link</Button>
                  <div className="text-center mt-2">
                    <button type="button" onClick={() => setIsForgotPassword(false)} className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline">
                      Back to Sign In
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </FormContainer>
        </div>

        {/* Sign Up Form Container */}
        <div className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out z-10 ${isSignUp ? "md:translate-x-full opacity-100 z-30" : "opacity-0 z-10"}`}>
          <FormContainer title="Create Account" description="Daftarkan identitas Anda untuk memulai transaksi properti dengan enkripsi end-to-end.">
            <form className="flex flex-col gap-4 w-full max-w-xs mx-auto" onSubmit={handleSignUp}>
              {message && isSignUp && (
                <div className={`text-xs p-2 rounded ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {message.text}
                </div>
              )}
              <div className="grid gap-2 text-left">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2 text-left">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2 text-left">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full mt-2 bg-zinc-900 hover:bg-zinc-800 text-white">Sign Up</Button>
            </form>
          </FormContainer>
        </div>

        {/* Overlay Container */}
        <div className={`absolute top-0 left-1/2 w-full md:w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-40 hidden md:block ${isSignUp ? "-translate-x-full" : ""}`}>
          <div className={`bg-gradient-to-br from-zinc-800 to-zinc-950 text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-1/2" : "translate-x-0"}`}>

            {/* Overlay Left (Visible when Sign Up is active, shows "Sign In" prompt) */}
            <div className={`absolute top-0 flex flex-col items-center justify-center h-full w-1/2 transform transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-0" : "-translate-x-[20%]"}`}>
              <div className="max-w-xs text-center px-8">
                <h1 className="text-3xl font-bold mb-4">Sudah Terdaftar?</h1>
                <p className="mb-8 text-zinc-300">Kembali kelola aset dan pantau validitas sertifikat Anda melalui dasbor yang aman.</p>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-zinc-900 w-32 rounded-full bg-transparent" onClick={toggleMode}>
                  Sign In
                </Button>
              </div>
            </div>

            {/* Overlay Right (Visible when Sign In is active, shows "Sign Up" prompt) */}
            <div className={`absolute top-0 right-0 flex flex-col items-center justify-center h-full w-1/2 transform transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-[20%]" : "translate-x-0"}`}>
              <div className="max-w-xs text-center px-8">
                <h1 className="text-3xl font-bold mb-4">Belum Punya Akun?</h1>
                <p className="mb-8 text-zinc-300">Mulai proteksi aset tanah Anda dengan teknologi steganografi tak kasat mata.</p>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-zinc-900 w-32 rounded-full bg-transparent" onClick={toggleMode}>
                  Sign Up
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Toggle (Visible only on small screens) */}
        <div className="md:hidden absolute bottom-4 left-0 w-full flex justify-center z-50">
          <Button variant="ghost" onClick={toggleMode} className="text-zinc-500 hover:text-zinc-900">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Button>
        </div>

      </div>
    </div>
  );
}

function FormContainer({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center bg-white">
      <h1 className="text-3xl font-bold mb-2 text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500 mb-6">{description}</p>
      {children}
    </div>
  );
}
