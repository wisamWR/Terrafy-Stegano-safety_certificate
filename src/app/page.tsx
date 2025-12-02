"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dummyCertificates = [
  {
    id: "ctf-01",
    title: "Sertifikat Tanah",
    subtitle: "Tanah di Desa",
    address: "Indraprasta, Semarang",
    luas: "100 m2",
    tanggal: "11 Februari 2006",
  },
  {
    id: "ctf-02",
    title: "Sertifikat Sawah",
    subtitle: "Sawah Bapak",
    address: "DR. Cipto, Semarang",
    luas: "1000 m2",
    tanggal: "11 Februari 2006",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-12">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold leading-tight">Beranda</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Kelola sertifikat Anda dengan aman — unggah, verifikasi, dan atur
            akun Anda di sini.
          </p>
        </header>

        {/* actions */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start md:items-stretch">
          {/* make each card stretch to same height */}
          <Card className="border-dashed h-full">
            <CardHeader>
              <CardTitle>Upload Foto</CardTitle>
              <CardDescription>Unggah sertifikat baru</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-6 flex-1">
              <div className="flex h-36 w-full flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white p-4 text-zinc-500">
                <div className="text-2xl">📤</div>
                <div className="mt-2 text-sm text-zinc-600">
                  Tarik atau pilih file untuk mengunggah
                </div>
              </div>
              <div className="w-full text-right">
                <Button variant="outline" size="sm">
                  Pilih File
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Verifikasi</CardTitle>
              <CardDescription>Cek keaslian sertifikat</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 flex-1">
              <Label htmlFor="no-sertifikat">Nomor / Kode Sertifikat</Label>
              <Input
                id="no-sertifikat"
                placeholder="Masukkan nomor atau kode..."
              />
              <div className="flex justify-end">
                <Button size="sm">Cek Keaslian</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
              <CardDescription>Kelola akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-1">
              <div className="text-zinc-700 text-sm">
                Kelola preferensi, profil, dan keamanan akun Anda.
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm">
                  Edit Profil
                </Button>
                <Button size="sm">Pengaturan</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* certificate list */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Daftar Sertifikat Anda</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Contoh data sertifikat yang tersimpan.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dummyCertificates.map((c) => (
              <Card key={c.id} className="h-full min-h-[140px]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{c.title}</CardTitle>
                      <CardDescription className="mt-1 text-zinc-500/90">
                        {c.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                  <div className="col-span-2 flex flex-wrap gap-6 text-sm text-zinc-700">
                    <div>
                      <div className="text-xs text-zinc-500">Alamat</div>
                      <div className="font-medium">{c.address}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Luas</div>
                      <div className="font-medium">{c.luas}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Tanggal</div>
                      <div className="font-medium">{c.tanggal}</div>
                    </div>
                  </div>
                  <div className="flex justify-end md:justify-center">
                    <Link href={`/sertifikat/${c.id}`} className="inline-block">
                      <Button size="sm">Lihat Detail</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
