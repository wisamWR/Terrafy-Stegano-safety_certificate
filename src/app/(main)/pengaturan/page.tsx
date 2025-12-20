"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  LogOut,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const session = localStorage.getItem("auth_session")
    if (session) {
      const userData = JSON.parse(session)
      setUser(userData)
      setName(userData.name)
      setEmail(userData.email)
    } else {
      // Dummy data for UI development
      const dummyUser = {
        name: "Pengguna Demo",
        email: "demo@example.com"
      }
      setUser(dummyUser)
      setName(dummyUser.name)
      setEmail(dummyUser.email)
    }
  }, [])

  const handleSaveProfile = () => {
    setMessage(null)
    if (!user) return

    try {
      const users = JSON.parse(localStorage.getItem("auth_users") || "[]")
      const updatedUsers = users.map((u: any) => {
        if (u.email === user.email) { // Identify by original email
          return { ...u, name, email, avatar: user.avatar }
        }
        return u
      })

      localStorage.setItem("auth_users", JSON.stringify(updatedUsers))

      const updatedUser = { ...user, name, email }
      localStorage.setItem("auth_session", JSON.stringify(updatedUser))
      setUser(updatedUser)

      // Notify other components
      window.dispatchEvent(new Event("auth-change"))

      setMessage({ type: "success", text: "Profil berhasil diperbarui!" })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menyimpan perubahan." })
    }
  }

  const handleDeleteAccount = () => {
    if (deleteConfirmation !== "DELETE") {
      setMessage({ type: "error", text: "Silakan ketik DELETE dengan benar." })
      return
    }

    try {
      const users = JSON.parse(localStorage.getItem("auth_users") || "[]")
      const updatedUsers = users.filter((u: any) => u.email !== user.email)

      localStorage.setItem("auth_users", JSON.stringify(updatedUsers))
      localStorage.removeItem("auth_session")

      window.dispatchEvent(new Event("auth-change"))
      router.push("/login")
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menghapus akun." })
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setUser({ ...user, avatar: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
      : "US";
  };

  const sidebarItems = [
    { value: "profile", label: "Profil", icon: User, description: "Kelola informasi pribadi Anda" },
    { value: "appearance", label: "Tampilan", icon: Palette, description: "Sesuaikan tema aplikasi" },
    { value: "notifications", label: "Notifikasi", icon: Bell, description: "Atur preferensi notifikasi" },
    { value: "security", label: "Keamanan", icon: Shield, description: "Kata sandi dan keamanan akun" },
    { value: "danger", label: "Danger Zone", icon: Trash2, description: "Hapus akun permanen", className: "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" },
  ]

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
                <div className="h-2 w-2 rounded-full bg-green-500 mr-3" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-red-500 mr-3" />
              )}
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            {/* Header for Mobile/Tablet context if needed, or just cleaner separation */}
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
              <Card className="border-none shadow-none md:border md:shadow-sm">
                <CardHeader className="px-0 md:px-6">
                  <CardTitle>Profil Pengguna</CardTitle>
                  <CardDescription>
                    Informasi ini akan ditampilkan secara publik, jadi berhati-hatilah dengan apa yang Anda bagikan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 md:px-6 space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                        <AvatarImage src={user.avatar || "/placeholder-avatar.jpg"} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(name)}</AvatarFallback>
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
                        onChange={handleImageUpload}
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-medium">{name || "Pengguna"}</h4>
                      <p className="text-sm text-muted-foreground">{email || "user@example.com"}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Ubah Foto
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 max-w-xl">
                    <div className="grid gap-2">
                      <Label htmlFor="full-name">Nama Lengkap</Label>
                      <Input
                        id="full-name"
                        placeholder="Masukkan nama lengkap Anda"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="max-w-md"
                      />
                      <p className="text-[0.8rem] text-muted-foreground">
                        Nama ini akan muncul di sertifikat dan profil Anda.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="nama@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-0 md:px-6 pt-6">
                  <Button onClick={handleSaveProfile} className="min-w-[120px]">Simpan</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Appearance Section */}
            <div className={activeTab === "appearance" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card className="border-none shadow-none md:border md:shadow-sm">
                <CardHeader className="px-0 md:px-6">
                  <CardTitle>Tampilan</CardTitle>
                  <CardDescription>
                    Sesuaikan tampilan aplikasi untuk pengalaman yang lebih nyaman.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 md:px-6 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base">Tema</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                      <div className="relative">
                        <div className="cursor-pointer overflow-hidden rounded-lg border-2 border-muted bg-popover hover:border-primary hover:text-primary transition-all">
                          <div className="items-center rounded-md p-4 flex flex-col gap-2 bg-white dark:bg-slate-950">
                            <Sun className="h-8 w-8 text-orange-500" />
                            <span className="font-medium text-sm">Terang</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="cursor-pointer overflow-hidden rounded-lg border-2 border-muted bg-popover hover:border-primary hover:text-primary transition-all">
                          <div className="items-center rounded-md p-4 flex flex-col gap-2 bg-slate-950 text-white">
                            <Moon className="h-8 w-8 text-blue-400" />
                            <span className="font-medium text-sm">Gelap</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="cursor-pointer overflow-hidden rounded-lg border-2 border-muted bg-popover hover:border-primary hover:text-primary transition-all">
                          <div className="items-center rounded-md p-4 flex flex-col gap-2 bg-slate-100 dark:bg-slate-800">
                            <Laptop className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                            <span className="font-medium text-sm">Sistem</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Pilih tema yang paling nyaman untuk mata Anda.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label htmlFor="language" className="text-base">Bahasa</Label>
                    <div className="max-w-xs">
                      <select
                        id="language"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="id"
                      >
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Pilih bahasa antarmuka yang ingin Anda gunakan.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="px-0 md:px-6 pt-6">
                  <Button>Simpan Preferensi</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Notifications Section */}
            <div className={activeTab === "notifications" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card className="border-none shadow-none md:border md:shadow-sm">
                <CardHeader className="px-0 md:px-6">
                  <CardTitle>Notifikasi</CardTitle>
                  <CardDescription>
                    Pilih notifikasi apa yang ingin Anda terima.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 md:px-6 space-y-6">
                  <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notifikasi Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Terima email tentang aktivitas akun Anda.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Terima notifikasi push di perangkat Anda.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Marketing</Label>
                      <p className="text-sm text-muted-foreground">
                        Terima email tentang fitur baru dan penawaran.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
                <CardFooter className="px-0 md:px-6 pt-6">
                  <Button>Simpan Pengaturan</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Security Section */}
            <div className={activeTab === "security" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card className="border-none shadow-none md:border md:shadow-sm">
                <CardHeader className="px-0 md:px-6">
                  <CardTitle>Keamanan</CardTitle>
                  <CardDescription>
                    Kelola keamanan akun Anda dan autentikasi dua faktor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 md:px-6 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Ubah Kata Sandi</h3>
                    <div className="grid gap-4 max-w-xl">
                      <div className="grid gap-2">
                        <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-password">Kata Sandi Baru</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                    <Button variant="outline" className="mt-2">Perbarui Kata Sandi</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Autentikasi Dua Faktor (2FA)</Label>
                      <p className="text-sm text-muted-foreground">
                        Tambahkan lapisan keamanan ekstra ke akun Anda.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Danger Zone Section */}
            <div className={activeTab === "danger" ? "block animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900">
                <CardHeader className="px-0 md:px-6">
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Hapus Akun
                  </CardTitle>
                  <CardDescription className="text-red-600/80">
                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus akun Anda secara permanen dan menghapus data Anda dari server kami.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 md:px-6">
                  <div className="space-y-4 max-w-md">
                    <div className="text-sm text-muted-foreground">
                      Silakan ketik <strong className="text-foreground">DELETE</strong> untuk mengonfirmasi.
                    </div>
                    <Input
                      className="bg-white dark:bg-slate-950 border-red-200 focus-visible:ring-red-500"
                      placeholder="DELETE"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="px-0 md:px-6 pt-6">
                  <Button variant="destructive" onClick={handleDeleteAccount}>Hapus Akun Saya</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
