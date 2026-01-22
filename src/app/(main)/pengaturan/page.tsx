"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Palette,
  Bell,
  Shield,
  Trash2,
  Camera,
  Moon,
  Sun,
  Laptop,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSession } from "@/lib/actions/auth"
import { updateProfile, updateAvatar, changePassword, deleteAccount } from "@/lib/actions/users"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  // Load Session
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        setUser(session)
      } else {
        router.push("/login")
      }
    })
  }, [router])

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const result = await updateProfile(null, formData)
    
    if (result.success) {
      showMessage("success", result.message || "Profil diperbarui")
      // Refresh local user state
      getSession().then(setUser)
    } else {
      showMessage("error", result.error || "Gagal memperbarui profil")
    }
    setLoading(false)
  }

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append("avatar", file)

    const result = await updateAvatar(null, formData)

    if (result.success) {
      showMessage("success", "Foto profil diperbarui")
      getSession().then(setUser)
    } else {
      showMessage("error", result.error || "Gagal upload foto")
    }
    setLoading(false)
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const result = await changePassword(null, formData)
    
    if (result.success) {
      showMessage("success", result.message || "Kata sandi diubah");
      // Reset form
      (e.currentTarget as HTMLFormElement).reset()
    } else {
      showMessage("error", result.error || "Gagal mengubah kata sandi")
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    // Validate confirmation keyword
    if (deleteConfirmation !== "DELETE") {
      showMessage("error", "Ketik DELETE untuk konfirmasi")
      return
    }

    // Validate password input
    if (!deletePassword) {
      showMessage("error", "Masukkan kata sandi untuk konfirmasi")
      return
    }

    setLoading(true)
    try {
        // Call server action with password
        const result = await deleteAccount(deletePassword)
        
        if (result.success) {
            router.push("/login")
        } else {
            showMessage("error", result.error || "Gagal menghapus akun")
            setLoading(false)
        }
    } catch (err) {
        console.error("Delete account error:", err)
        showMessage("error", "Terjadi kesalahan sistem")
        setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "US";
  };

  const sidebarItems = [
    { value: "profile", label: "Profil", icon: User, description: "Kelola informasi pribadi Anda" },
    { value: "appearance", label: "Tampilan", icon: Palette, description: "Sesuaikan tema aplikasi" },
    { value: "security", label: "Keamanan", icon: Shield, description: "Kata sandi dan keamanan akun" },
    { value: "danger", label: "Danger Zone", icon: Trash2, description: "Hapus akun permanen", className: "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20" },
  ]

  if (!user) return <div className="p-8 text-center animate-pulse">Memuat pengaturan...</div>

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola akun dan preferensi Anda.
            </p>
          </div>

          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val)
              setMessage(null)
            }}
            className="w-full"
          >
            <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1 w-full items-stretch">
              {sidebarItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "justify-start px-3 py-2.5 h-auto text-sm font-medium transition-all rounded-md w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted",
                    item.className
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  <div className="flex flex-col items-start text-left">
                    <span>{item.label}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {message && (
            <div className={cn(
              "mb-6 p-4 rounded-lg flex items-center shadow-sm animate-in fade-in slide-in-from-top-2",
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              ) : (
                <Shield className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div className="mb-6 pb-4 border-b hidden md:block">
              <h3 className="text-lg font-medium">
                {sidebarItems.find(i => i.value === activeTab)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {sidebarItems.find(i => i.value === activeTab)?.description}
              </p>
            </div>

            {/* Profile Section */}
            <div className={activeTab === "profile" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card>
                <form onSubmit={handleUpdateProfile}>
                  <CardHeader>
                    <CardTitle>Profil Pengguna</CardTitle>
                    <CardDescription>
                      Informasi publik yang terlihat di sertifikat Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                          <AvatarImage src={user.image || "/placeholder-avatar.jpg"} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div
                          className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4" />
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleUpdateAvatar}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <h4 className="text-lg font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                        >
                          {loading ? "Mengupload..." : "Ubah Foto"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-6 max-w-xl">
                      <div className="grid gap-2">
                        <Label htmlFor="full-name">Nama Lengkap</Label>
                        <Input
                          id="full-name"
                          name="name"
                          defaultValue={user.name}
                          placeholder="Nama lengkap Anda"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          placeholder="Email Anda"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Appearance Section */}
            <div className={activeTab === "appearance" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card>
                <CardHeader>
                  <CardTitle>Tampilan</CardTitle>
                  <CardDescription>
                    Pilih tema aplikasi yang nyaman untuk mata Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                        {/* Light */}
                      <div 
                        className={cn("cursor-pointer rounded-lg border-2 bg-popover hover:bg-accent transition-all p-4 flex flex-col gap-2 items-center", theme === 'light' ? 'border-primary' : 'border-muted')}
                        onClick={() => setTheme('light')}
                      >
                         <Sun className="h-6 w-6 text-orange-500" />
                         <span className="font-medium text-sm">Terang</span>
                      </div>
                        {/* Dark */}
                      <div 
                        className={cn("cursor-pointer rounded-lg border-2 bg-popover hover:bg-accent transition-all p-4 flex flex-col gap-2 items-center", theme === 'dark' ? 'border-primary' : 'border-muted')}
                        onClick={() => setTheme('dark')}
                      >
                         <Moon className="h-6 w-6 text-blue-500" />
                         <span className="font-medium text-sm">Gelap</span>
                      </div>
                        {/* System */}
                      <div 
                        className={cn("cursor-pointer rounded-lg border-2 bg-popover hover:bg-accent transition-all p-4 flex flex-col gap-2 items-center", theme === 'system' ? 'border-primary' : 'border-muted')}
                        onClick={() => setTheme('system')}
                      >
                         <Laptop className="h-6 w-6 text-slate-500" />
                         <span className="font-medium text-sm">Sistem</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Section */}
            <div className={activeTab === "security" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card>
                <form onSubmit={handleChangePassword}>
                  <CardHeader>
                    <CardTitle>Keamanan</CardTitle>
                    <CardDescription>
                      Update kata sandi Anda secara berkala.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 max-w-xl">
                      <div className="grid gap-2">
                        <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
                        <Input id="current-password" name="currentPassword" type="password" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-password">Kata Sandi Baru</Label>
                        <Input id="new-password" name="newPassword" type="password" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</Label>
                        <Input id="confirm-password" name="confirmPassword" type="password" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button type="submit" variant="outline" disabled={loading}>
                        {loading ? "Memproses..." : "Perbarui Kata Sandi"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Danger Zone Section */}
            <div className={activeTab === "danger" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Hapus Akun
                  </CardTitle>
                  <CardDescription className="text-red-600/80 dark:text-red-400/80">
                    Tindakan ini permanen. Data sertifikat Anda mungkin akan tetap tersimpan di blockchain/arsip untuk validitas hukum.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                         <Label className="text-red-900 dark:text-red-300">Konfirmasi Kata Sandi</Label>
                         <Input
                            id="delete-password-input"
                            type="password"
                            className="bg-white dark:bg-slate-950 border-red-200 focus-visible:ring-red-500"
                            placeholder="Masukkan kata sandi Anda"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                         />
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                        Ketik <strong className="text-foreground">DELETE</strong> untuk konfirmasi.
                        </div>
                        <Input
                        className="bg-white dark:bg-slate-950 border-red-200 focus-visible:ring-red-500"
                        placeholder="DELETE"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading || deleteConfirmation !== 'DELETE' || !deletePassword}>
                     {loading ? "Menghapus..." : "Hapus Akun Saya"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
