"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, History, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  params: { id: string };
}

const exampleData = {
  kode: "111/SRTV/X/2006",
  nama: "Ridelo",
  luas: "100 m2",
  alamat: "Indraprasta, Semarang",
  tanggalUpload: "11 Februari 2006",
  keterangan: "Rumah Besar Di Kota",
};

const ownershipHistory = [
  {
    name: "Ridelo",
    role: "Pemilik Saat Ini",
    email: "ridelo@gmail.com",
    date: "11 Februari 2006",
    note: "Sertifikat awal diunggah",
    isCurrent: true,
  },
  {
    name: "Budi Santoso",
    role: "Pemilik Ke-2",
    email: "budi.santoso@email.com",
    date: "10 Januari 2020",
    note: "Jual beli tanah",
    isCurrent: false,
  },
  {
    name: "Siti Aminah",
    role: "Pemilik Ke-3",
    email: "siti.aminah@email.com",
    date: "15 Maret 2015",
    note: "Warisan keluarga",
    isCurrent: false,
  },
  {
    name: "Ahmad Dahlan",
    role: "Pemilik Ke-4",
    email: "ahmad.dahlan@email.com",
    date: "20 Agustus 2010",
    note: "Pecah sertifikat",
    isCurrent: false,
  },
  {
    name: "PT. Pembangunan Jaya",
    role: "Kepemilikan Awal",
    email: "admin@pembangunanjaya.com",
    date: "01 Januari 2006",
    note: "Sertifikat induk diterbitkan",
    isCurrent: false,
  },
];

export default function Page({ params }: Props) {
  const { id } = params;
  const [transferOpen, setTransferOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferType, setTransferType] = useState("Jual Beli");
  const [note, setNote] = useState("");
  const [transferSuccess, setTransferSuccess] = useState<null | {
    email: string;
    type: string;
  }>(null);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
          <h1 className="text-xl font-semibold">Detail Sertifikat</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{exampleData.kode}</CardTitle>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Download
                </Button>
                <Button size="sm" onClick={() => setTransferOpen(true)}>
                  Transfer
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 text-sm text-zinc-700">
              <div>
                <div className="text-xs text-zinc-500">Nama Pemegang</div>
                <div className="font-medium">{exampleData.nama}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Luas Tanah</div>
                <div className="font-medium">{exampleData.luas}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Alamat</div>
                <div className="font-medium">{exampleData.alamat}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Keterangan</div>
                <div className="font-medium">{exampleData.keterangan}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Tanggal Upload</div>
                <div className="font-medium">{exampleData.tanggalUpload}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* success notification */}
        {transferSuccess && (
          <div className="mb-4 rounded-md border bg-green-50 p-3 text-sm text-green-800">
            Transfer berhasil dikirim ke{" "}
            <strong>{transferSuccess.email}</strong> ({transferSuccess.type})
          </div>
        )}

        {/* transfer modal overlay */}
        {transferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setTransferOpen(false)}
            />

            <div className="relative z-10 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Transfer Sertifikat</h3>
                  <p className="text-sm text-muted-foreground">
                    Kirimkan sertifikat ini ke pengguna lain
                  </p>
                </div>
                <button
                  onClick={() => setTransferOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Email Penerima *
                  </label>
                  <input
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="nama.penerima@email.com"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    type="email"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Jenis Transfer *
                  </label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option>Jual Beli</option>
                    <option>Wakaf</option>
                    <option>Hibah</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Catatan
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="Catatan atau keterangan transfer (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setTransferOpen(false)}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      // simple validation
                      if (!recipientEmail || !transferType) return;
                      setTransferOpen(false);
                      setTransferSuccess({
                        email: recipientEmail,
                        type: transferType,
                      });
                      // reset form (optional)
                      setRecipientEmail("");
                      setTransferType("Jual Beli");
                      setNote("");
                      // hide notification after a short while
                      setTimeout(() => setTransferSuccess(null), 6000);
                    }}
                    className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-95"
                  >
                    Kirim Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Riwayat Kepemilikan</h2>

          <div className="space-y-4">
            {ownershipHistory.map((h, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Avatar>
                          <AvatarFallback>{h.name?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{h.name}</div>
                          <div className="text-sm text-zinc-500">{h.email}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="rounded-md border px-3 py-1 text-xs">
                            {h.role}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-md border bg-background p-4 text-sm text-zinc-600">
                        <div className="text-xs text-zinc-400">{h.date}</div>
                        <div className="mt-2 italic">{`"${h.note}"`}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-zinc-500">
                    {index === 0
                      ? "Ini adalah pemegang saat ini."
                      : "Catatan transaksi / keterangan kepemilikan."}
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
