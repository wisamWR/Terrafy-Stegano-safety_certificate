"use server"

import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import * as crypto from "crypto"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import { Steganography } from "@/lib/steganography"
import { exec } from "child_process"
import util from "util"
import { revalidatePath } from "next/cache"
const execAsync = util.promisify(exec)

export async function getUserCertificates() {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) {
        return { error: "Silakan login terlebih dahulu" }
    }

    try {
        const session = JSON.parse(sessionValue)
        const userId = session.id

        console.log(`[QUERY] Fetching user certificates for ${userId} via RAW SQL...`)
        const certificates = await prisma.$queryRawUnsafe(
            `SELECT * FROM "Certificate" 
             WHERE "ownerId" = $1 
             AND "nomor_sertifikat" NOT LIKE '%_REJECTED_%' 
             AND "nomor_sertifikat" NOT LIKE '%_PENDING_OVERWRITE_%'
             ORDER BY "createdAt" DESC`,
            userId
        ) as any[]

        return { success: true, certificates }
    } catch (error) {
        console.error("Fetch certificates error:", error)
        return { error: "Gagal mengambil data sertifikat" }
    }
}


export async function createCertificate(formData: any) {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) {
        return { error: "Silakan login terlebih dahulu" }
    }

    try {
        const session = JSON.parse(sessionValue)
        const userId = session.id

        // Handle File Upload
        const file = formData.get("file") as File
        let imageUrl = null

        if (file && file.size > 0) {
            const buffer = Buffer.from(await file.arrayBuffer())
            // Ensure public/uploads exists
            const uploadDir = path.join(process.cwd(), "public", "uploads")
            await mkdir(uploadDir, { recursive: true })

            // Safe filename
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
            const filename = `cert_${timestamp}_${safeName}`
            const filePath = path.join(uploadDir, filename)

            await writeFile(filePath, buffer)
            imageUrl = `/uploads/${filename}`
        }

        // Check for duplicate certificate number
        const inputNomor = (formData.get("nomorSertifikat") as string || "").trim();
        console.log(`[CREATE] Checking for duplicate: '${inputNomor}'`);

        const existingCert = await prisma.certificate.findFirst({
            where: {
                nomor_sertifikat: inputNomor
            }
        });

        if (existingCert) {
            // Check status
            // Check status: Allow overwrite if REJECTED or PENDING
            if (existingCert.status === 'REJECTED' || existingCert.status === 'PENDING') {
                console.log(`[CREATE] Found ${existingCert.status} duplicate for '${inputNomor}'. Archiving old cert...`);

                // Archive the old cert by renaming its number
                // This frees up the unique slot for the new upload
                const suffix = existingCert.status === 'REJECTED' ? 'REJECTED' : 'PENDING_OVERWRITE';
                const archivedNumber = `${inputNomor}_${suffix}_${Date.now()}`;

                await prisma.certificate.update({
                    where: { id: existingCert.id },
                    data: {
                        nomor_sertifikat: archivedNumber,
                        keterangan: (existingCert.keterangan || "") + ` [ARCHIVED ${existingCert.status} DUPLICATE]`
                    }
                });
                console.log(`[CREATE] Archived old cert ${existingCert.id} to ${archivedNumber}`);
            } else {
                console.warn(`[CREATE] Duplicate found for: '${inputNomor}' with status ${existingCert.status}`);
                return { error: "DUPLICATE_NUMBER", message: "Nomor sertifikat sudah terdaftar dalam sistem." };
            }
        }

        // Create certificate via RAW SQL to avoid Enum errors
        const newId = crypto.randomUUID();
        const rows = await prisma.$queryRawUnsafe(`
            INSERT INTO "Certificate" (
                id, nomor_sertifikat, nama_lahan, luas_tanah, lokasi, keterangan, 
                "ownerId", status, "issueDate", image_url, "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
            ) RETURNING *
        `,
            newId,
            inputNomor, // Use trimmed value
            formData.get("namaSertifikat") as string,
            (formData.get("luasTanah") as string) + " m2",
            formData.get("alamat") as string,
            formData.get("keterangan") as string,
            userId,
            "PENDING",
            new Date(),
            imageUrl
        ) as any[];

        if (!rows || rows.length === 0) {
            throw new Error("Gagal menyimpan sertifikat ke database");
        }
        const certificate = rows[0];

        // Create notification for pending certificate
        await prisma.notification.create({
            data: {
                userId: userId,
                certificateId: certificate.id,
                title: "Sertifikat Menunggu Verifikasi",
                message: `Sertifikat ${formData.get("namaSertifikat")} (${formData.get("nomorSertifikat")}) sedang dalam proses verifikasi.`,
                type: "CERTIFICATE_PENDING",
            },
        })

        // Add to History: Pendaftaran
        await prisma.history.create({
            data: {
                certificateId: certificate.id,
                actor_name: session.name || "User",
                actor_email: session.email,
                action: "Pendaftaran",
                note: "Pengajuan pendaftaran aset baru.",
                owner_name: session.name || "User",
                owner_email: session.email,
            }
        })

        return { success: true, certificate }
    } catch (error: any) {
        console.error("Create certificate error:", error);

        // Handle Unique Constraint Violation (Postgres Code 23505 or message)
        if (error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate key'))) {
            return { error: "DUPLICATE_NUMBER", message: "Nomor sertifikat sudah terdaftar dalam sistem." };
        }

        return { error: "Gagal menambahkan sertifikat: " + (error.message || error) }
    }
}

export async function requestTransfer(certId: string, targetEmail: string) {
    console.log(`[TRANSFER] Starting request: certId=${certId}, targetEmail=${targetEmail}`)
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) {
        console.warn("[TRANSFER] No session found")
        return { error: "Silakan login terlebih dahulu" }
    }

    try {
        const session = JSON.parse(sessionValue)
        const userId = session.id
        console.log(`[TRANSFER] User: ${session.email} (ID: ${userId})`)

        // 1. Find Certificate and Check Ownership using RAW SQL to bypass Prisma Enum errors
        console.log(`[TRANSFER] Fetching certificate ${certId} via RAW SQL...`)
        const certificates = await prisma.$queryRawUnsafe(
            `SELECT c.*, u.email as "ownerEmail", u.name as "ownerName" 
             FROM "Certificate" c 
             JOIN "User" u ON c."ownerId" = u.id 
             WHERE c.id = $1 LIMIT 1`,
            certId
        ) as any[]

        if (!certificates || certificates.length === 0) {
            console.error(`[TRANSFER] Certificate ${certId} not found via Raw SQL`)
            return { error: "Sertifikat tidak ditemukan" }
        }

        const certificate = certificates[0]
        console.log(`[TRANSFER] Cert found via Raw SQL: ${certificate.nama_lahan} (Status: ${certificate.status})`)

        if (certificate.ownerId !== userId) {
            console.warn(`[TRANSFER] Ownership mismatch. CertOwner: ${certificate.ownerId}, CurrentUser: ${userId}`)
            return { error: "Hanya pemilik sertifikat yang dapat melakukan transfer" }
        }

        if (certificate.status !== "VERIFIED") {
            console.warn(`[TRANSFER] Invalid status for transfer: ${certificate.status}`)
            return { error: "Hanya sertifikat yang sudah terverifikasi yang dapat ditransfer" }
        }

        if (targetEmail === session.email) {
            console.warn("[TRANSFER] Self-transfer attempt")
            return { error: "Anda tidak dapat mengirim sertifikat ke diri sendiri" }
        }

        // 2. Find Target User
        const targetUser = await prisma.user.findUnique({
            where: { email: targetEmail }
        })

        if (!targetUser) {
            console.warn(`[TRANSFER] Target user not found: ${targetEmail}`)
            return { error: "Email tujuan tidak terdaftar di sistem" }
        }

        console.log(`[TRANSFER] Target user found: ${targetUser.email} (ID: ${targetUser.id})`)

        // 3. Update status to AWAITING_RECIPIENT using RAW SQL to bypass Prisma Client sync issues
        console.log("[TRANSFER] Updating certificate status via RAW SQL...")
        await prisma.$executeRawUnsafe(
            `UPDATE "Certificate" SET status = 'AWAITING_RECIPIENT', "transferToEmail" = $1 WHERE id = $2`,
            targetEmail,
            certId
        )
        console.log("[TRANSFER] Raw update successful")

        // 4. Create Notification for Target User
        console.log("[TRANSFER] Creating notification for recipient...")
        await prisma.notification.create({
            data: {
                userId: targetUser.id,
                certificateId: certId,
                title: "Permohonan Pengalihan Aset",
                message: `${session.name} ingin mengalihkan sertifikat ${certificate.nama_lahan} kepada Anda. Mohon konfirmasi.`,
                type: "TRANSFER_REQUEST" as any,
            }
        })
        console.log("[TRANSFER] Notification created")

        // revalidatePath(`/sertifikat/${certId}`) // Disabled to allow client to show success modal first
        return { success: true }
    } catch (error: any) {
        console.error("[TRANSFER] Fatal error:", error)
        return { error: "Gagal memproses permohonan transfer: " + (error.message || error) }
    }
}

export async function acceptTransfer(certId: string) {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) return { error: "Silakan login terlebih dahulu" }

    try {
        const session = JSON.parse(sessionValue)

        // 1. Fetch cert and check if session email matches transferToEmail
        const certs = await prisma.$queryRawUnsafe(
            `SELECT * FROM "Certificate" WHERE id = $1 LIMIT 1`,
            certId
        ) as any[]

        if (!certs || certs.length === 0) return { error: "Sertifikat tidak ditemukan" }
        const cert = certs[0]

        if (cert.transferToEmail !== session.email) {
            return { error: "Anda bukan penerima yang ditujukan untuk sertifikat ini" }
        }

        // 2. Update status to TRANSFER_PENDING (Now it goes to Admin)
        await prisma.$executeRawUnsafe(
            `UPDATE "Certificate" SET status = 'TRANSFER_PENDING' WHERE id = $1`,
            certId
        )

        // 3. Add History
        await prisma.history.create({
            data: {
                certificateId: certId,
                actor_name: session.name || "Penerima",
                actor_email: session.email,
                action: "Konfirmasi Penerima",
                note: "Penerima menyetujui permohonan pengalihan. Menunggu verifikasi admin.",
                owner_name: session.name, // Temporary log as part of flow
                owner_email: session.email,
            }
        })

        // revalidatePath(`/sertifikat/${certId}`) // Disabled to allow client popup
        return { success: true }
    } catch (error) {
        console.error("Accept transfer error:", error)
        return { error: "Gagal menyetujui transfer" }
    }
}

export async function rejectTransfer(certId: string) {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) return { error: "Silakan login terlebih dahulu" }

    try {
        const session = JSON.parse(sessionValue)

        // 1. Reset status back to VERIFIED and clear transferToEmail
        await prisma.$executeRawUnsafe(
            `UPDATE "Certificate" SET status = 'VERIFIED', "transferToEmail" = NULL WHERE id = $1 AND "transferToEmail" = $2`,
            certId,
            session.email
        )

        // 2. Add History
        await prisma.history.create({
            data: {
                certificateId: certId,
                actor_name: session.name || "Penerima",
                actor_email: session.email,
                action: "Penolakan Transfer",
                note: "Penerima menolak permohonan pengalihan aset.",
                owner_name: session.name, // Temporary
                owner_email: session.email,
            }
        })

        // 3. Update Existing Notification for Recipient to "Rejected"
        // We find the specific TRANSFER_REQUEST notification for this user and cert
        await prisma.notification.updateMany({
            where: {
                userId: session.id,
                certificateId: certId,
                type: 'TRANSFER_REQUEST'
            },
            data: {
                title: "Transfer Ditolak",
                message: "Anda telah menolak permintaan transfer sertifikat ini.",
                type: 'CERTIFICATE_REJECTED',
                certificateId: null // Remove link so they can't click details anymore
            }
        })

        // 4. Notify Owner (We need owner ID)
        const certData = await prisma.$queryRawUnsafe(
            `SELECT "ownerId", nama_lahan FROM "Certificate" WHERE id = $1`, certId
        ) as any[]

        if (certData && certData[0]) {
            await prisma.notification.create({
                data: {
                    userId: certData[0].ownerId,
                    certificateId: certId,
                    title: "Transfer Ditolak Penerima",
                    message: `${session.name} menolak permintaan pengalihan sertifikat ${certData[0].nama_lahan}.`,
                    type: "CERTIFICATE_REJECTED",
                }
            })
        }

        // revalidatePath(`/sertifikat/${certId}`) // Disabled to allow client popup
        return { success: true }
    } catch (error) {
        console.error("Reject transfer error:", error)
        return { error: "Gagal menolak transfer" }
    }
}

export async function getAllCertificates() {
    // Hanya untuk ADMIN/Dinas
    try {
        console.log("[QUERY] Fetching all certificates via RAW SQL...")
        const certs = await prisma.$queryRawUnsafe(
            `SELECT c.*, u.name as "ownerName", u.email as "ownerEmail" 
             FROM "Certificate" c 
             JOIN "User" u ON c."ownerId" = u.id 
             WHERE c."nomor_sertifikat" NOT LIKE '%_REJECTED_%' 
             AND c."nomor_sertifikat" NOT LIKE '%_PENDING_OVERWRITE_%'
             ORDER BY c."createdAt" DESC`
        ) as any[]

        const certificates = certs.map((c: any) => ({
            ...c,
            owner: {
                id: c.ownerId,
                name: c.ownerName || c.ownerEmail || "User",
                email: c.ownerEmail
            }
        }));

        return { success: true, certificates }
    } catch (error) {
        console.error("Fetch all certificates resilient error:", error)
        return { error: "Gagal mengambil data" }
    }
}

export async function getAdminStats() {
    try {
        const whereNotArchived = {
            AND: [
                { nomor_sertifikat: { not: { contains: "_REJECTED_" } } },
                { nomor_sertifikat: { not: { contains: "_PENDING_OVERWRITE_" } } }
            ]
        };

        const currentYear = new Date().getFullYear();
        const [
            totalCertificates,
            pendingCount,
            verifiedCount,
            rejectedCount,
            totalUsers,
            allCertDates
        ] = await Promise.all([
            prisma.certificate.count({ where: whereNotArchived }),
            prisma.certificate.count({ where: { ...whereNotArchived, status: "PENDING" } }),
            prisma.certificate.count({ where: { ...whereNotArchived, status: "VERIFIED" } }),
            prisma.certificate.count({ where: { ...whereNotArchived, status: "REJECTED" } }),
            prisma.user.count({ where: { role: "USER" } }),
            prisma.certificate.findMany({
                where: {
                    ...whereNotArchived,
                    createdAt: {
                        gte: new Date(currentYear, 0, 1),
                        lt: new Date(currentYear + 1, 0, 1)
                    }
                },
                select: { createdAt: true }
            }),
        ]);

        // Fetch TRANSFER counts via raw SQL (including AWAITING_RECIPIENT and TRANSFER_PENDING)
        const transferCountRaw = await prisma.$queryRawUnsafe(
            `SELECT count(*)::int as count FROM "Certificate" 
             WHERE status IN ('TRANSFER_PENDING', 'AWAITING_RECIPIENT')
             AND "nomor_sertifikat" NOT LIKE '%_REJECTED_%' 
             AND "nomor_sertifikat" NOT LIKE '%_PENDING_OVERWRITE_%'`
        ) as any[]
        const inTransferCount = transferCountRaw[0].count;

        // Calculate Monthly Trend (Current Year)
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const monthlyTrend = months.map((month, index) => {
            const count = allCertDates.filter((c: any) => new Date(c.createdAt).getMonth() === index).length;
            return { name: month, total: count };
        });

        // Calculate Status Distribution
        const statusData = [
            { name: "approved", value: verifiedCount, fill: "var(--color-approved)" },
            { name: "pending", value: pendingCount, fill: "var(--color-pending)" },
            { name: "rejected", value: rejectedCount, fill: "var(--color-rejected)" },
            { name: "transfer", value: inTransferCount, fill: "var(--color-transfer)" },
        ];

        // Fetch total successful transfers from history
        const transfersCountRaw = await prisma.$queryRawUnsafe(
            `SELECT count(*)::int as count FROM "History" WHERE action = 'Pengalihan Hak'`
        ) as any[]
        const approvedTransfersCount = transfersCountRaw[0].count;

        return {
            success: true,
            stats: {
                total: totalCertificates,
                pending: pendingCount,
                verified: verifiedCount,
                rejected: rejectedCount,
                transfer: inTransferCount,
                approvedTransfers: approvedTransfersCount,
                users: totalUsers,
            },
            statusData,
            monthlyTrend,
        };
    } catch (error) {
        console.error("Admin stats error:", error)
        return { error: "Gagal mengambil statistik" }
    }
}


export async function updateCertificateStatus(id: string, status: "VERIFIED" | "REJECTED", note?: string, adminId?: string) {
    console.log(`[ACTION] updateCertificateStatus called for ${id} with status ${status}`)
    try {
        // 1. Get session from Cookie (Secure)
        const cookieStore = await cookies()
        const sessionValue = cookieStore.get("user_session")?.value

        if (!sessionValue) {
            return { error: "Silakan login sebagai admin" }
        }

        const session = JSON.parse(sessionValue)

        // 2. Validate Admin Role
        if (session.role !== "ADMIN") {
            return { error: "Anda tidak memiliki akses admin" }
        }

        const adminInfo = {
            id: session.id,
            name: session.name || "Admin",
            email: session.email
        }
        console.log(`[ACTION] Admin session: ${adminInfo.email} (${adminInfo.id})`)

        // 2. Validate Admin Exists in DB (Important after database reset)
        const adminInDb = await prisma.user.findUnique({
            where: { id: adminInfo.id }
        });

        if (!adminInDb) {
            return { error: "Sesi admin tidak valid atau akun telah dihapus. Silakan logout dan login kembali." }
        }
        console.log(`[ACTION] Admin verified in DB: ${adminInDb.email}`)

        // Check current status and metadata via RAW SQL to avoid Enum errors
        const certs = await prisma.$queryRawUnsafe(
            `SELECT c.*, m.id as "metaId", m."stegoImage", m.algorithm as "metaAlgo" 
             FROM "Certificate" c 
             LEFT JOIN "SteganographyMetadata" m ON c.id = m."certificateId" 
             WHERE c.id = $1 LIMIT 1`,
            id
        ) as any[]

        if (!certs || certs.length === 0) {
            return { error: "Sertifikat tidak ditemukan" }
        }

        const existingCertRaw = certs[0]
        const existingCert = {
            ...existingCertRaw,
            steganographyMetadata: existingCertRaw.metaId ? {
                id: existingCertRaw.metaId,
                stegoImage: existingCertRaw.stegoImage,
                algorithm: existingCertRaw.metaAlgo
            } : null
        }

        let shouldUpdateDB = true;
        let shouldCreateLog = true;
        let certificate = existingCert;

        if (existingCert && existingCert.status === status) {
            // Special Case: Re-approving a TRANSFER_PENDING as VERIFIED is basically "Rejecting" the transfer back to VERIFIED?
            // No, the UI for Admin Approval should have "Approve Transfer" or "Reject Transfer".
            // If the admin clicks "Approve", it goes from TRANSFER_PENDING back to VERIFIED but with a NEW OWNER.
            if (existingCert.status === ("TRANSFER_PENDING" as any) && status === "VERIFIED") {
                console.log(`[ACTION] Approving Transfer for ${id}...`);
            } else if (status === "VERIFIED" && !existingCert.steganographyMetadata && existingCert.image_url) {
                console.log(`[ACTION] Certificate ${id} is VERIFIED but missing Stego. Retrying Stego process...`);
                shouldUpdateDB = false;
                shouldCreateLog = false;
            } else {
                console.log(`[ACTION] Certificate ${id} is already ${status}. Skipping update.`);
                return { success: true, certificate: existingCert };
            }
        }

        // Prepare update data based on status
        const updateData: any = { status }
        if (status === "VERIFIED") {
            updateData.verifiedBy = adminInfo.id
            if (shouldUpdateDB) updateData.verifiedAt = new Date()
        } else if (status === "REJECTED") {
            updateData.rejectedBy = adminInfo.id
            if (shouldUpdateDB) updateData.rejectedAt = new Date()
            updateData.rejectionReason = note || "Sertifikat ditolak karena ketidaksesuaian data."
        }

        if (shouldUpdateDB) {
            console.log("[ACTION] Updating Certificate via RAW SQL...")

            // Handle Transfer Logic inside update
            if (status === "VERIFIED" && existingCert.status === ("TRANSFER_PENDING" as any)) {
                // Find Target User
                const targetUser = await prisma.user.findUnique({
                    where: { email: (existingCert as any).transferToEmail || "" }
                });

                if (!targetUser) {
                    return { error: "User tujuan transfer tidak ditemukan" };
                }

                updateData.ownerId = targetUser.id;
                updateData.transferToEmail = null;
                // We also need to delete existing stego metadata so it gets regenerated for the new owner
                await prisma.steganographyMetadata.deleteMany({ where: { certificateId: id } });
            } else if (status === "REJECTED" && existingCert.status === ("TRANSFER_PENDING" as any)) {
                // Rejecting a transfer returns it to VERIFIED status under original owner
                updateData.status = "VERIFIED";
                updateData.transferToEmail = null;
            }

            // Perform manual update using Prisma Client
            // Note: We cast status and ownerId as any to avoid strictly type-checking the enum if there are sync issues,
            // but Prisma Client should handle the literal strings 'VERIFIED' etc just fine.
            await (prisma.certificate as any).update({
                where: { id: id },
                data: updateData
            });

            // Fetch the updated certificate using the resilient fetcher
            const updated = await getCertificateById(id);
            if (!updated.success || !updated.certificate) {
                return { error: "Gagal memuat sertifikat setelah diperbarui" };
            }
            certificate = updated.certificate;
        }

        if (shouldCreateLog && certificate) {
            // Tambahkan ke History
            console.log("[ACTION] Creating History...")

            let actionName = status === "VERIFIED" ? "Verifikasi" : "Penolakan";
            let actionNote = note || (status === "VERIFIED" ? "Sertifikat telah diverifikasi oleh admin." : "Sertifikat ditolak karena ketidaksesuaian data.");

            if (existingCert.status === ("TRANSFER_PENDING" as any)) {
                if (status === "VERIFIED") {
                    actionName = "Pengalihan Hak";
                    actionNote = note || `Persetujuan pengalihan hak kepemilikan kepada ${(certificate as any).owner.email}.`;
                } else {
                    actionName = "Pembatalan Transfer";
                    actionNote = note || "Permohonan pengalihan hak ditolak oleh admin.";
                }
            }

            await prisma.history.create({
                data: {
                    certificateId: id,
                    actor_name: adminInfo.name,
                    actor_email: adminInfo.email,
                    action: actionName,
                    note: actionNote,
                    owner_name: (certificate as any).owner.name,
                    owner_email: (certificate as any).owner.email,
                } as any
            });

            // Refresh certificate to include new history
            const refreshed = await getCertificateById(id);
            if (refreshed.success && refreshed.certificate) {
                certificate = refreshed.certificate;
            }
        }

        // ---------------------------------------------------------
        // STEGANOGRAPHY PROCESS (ONLY IF VERIFIED AND IMAGE EXISTS)
        // ---------------------------------------------------------
        // We run this if status is VERIFIED AND (we just updated it OR duplicate check allowed us here for retry)
        if (status === "VERIFIED" && certificate?.image_url) {

            // Double check if metadata already exists to avoid duplicate work (though check above handled it, safety first)
            const metaExists = await prisma.steganographyMetadata.findUnique({ where: { certificateId: id } });

            if (!metaExists) {
                console.log("[STEGO] Starting Steganography Process...")
                try {
                    console.log("[STEGO] Embedding data with Node.js...");
                    // Locate if file exists
                    const relativePath = (certificate?.image_url || "").startsWith("/") || (certificate?.image_url || "").startsWith("\\")
                        ? (certificate?.image_url || "").substring(1)
                        : (certificate?.image_url || "");

                    const safeInputPath = path.join(process.cwd(), "public", relativePath);

                    const ext = path.extname(safeInputPath);
                    const filename = path.basename(safeInputPath, ext);
                    const stegoDir = path.join(process.cwd(), "public", "uploads", "stego");

                    // Ensure directory exists
                    await mkdir(stegoDir, { recursive: true });

                    const outputFilename = `${filename}_stego.png`; // Force PNG
                    const safeOutputPath = path.join(stegoDir, outputFilename);
                    const publicStegoUrl = `/uploads/stego/${outputFilename}`;

                    // Prepare Payload
                    const verifiedDate = updateData.verifiedAt || (certificate as any)?.verifiedAt || new Date();

                    // 1. Fetch History for Payload (Now includes the action we just created)
                    const historyRows = await prisma.$queryRawUnsafe(
                        `SELECT actor_name, action, "createdAt", owner_name FROM "History" WHERE "certificateId" = $1 ORDER BY "createdAt" ASC`,
                        id
                    ) as any[];

                    const historySummary = historyRows.map(h => ({
                        a: h.action,
                        o: h.owner_name,
                        d: h.createdAt
                    }));

                    const payload = {
                        certId: id,
                        ownerId: (certificate as any)?.ownerId,
                        ownerName: (certificate as any)?.owner.name,
                        verifiedAt: verifiedDate instanceof Date ? verifiedDate.toISOString() : new Date(verifiedDate).toISOString(),
                        validator: adminInfo.name,
                        serial: (certificate as any)?.nomor_sertifikat,
                        history: historySummary.map(h => ({
                            ...h,
                            d: h.d instanceof Date ? h.d.toISOString() : h.d
                        }))
                    };

                    const payloadStr = JSON.stringify(payload);

                    // 1. Generate SHA-256 Hash for Integrity (Digital Signature)
                    const hashValue = crypto.createHash('sha256').update(payloadStr).digest('hex');
                    console.log(`[STEGO] Generated Data Hash: ${hashValue}`);

                    // 2. AES Encryption (GCM) for Privacy
                    const rawKey = process.env.ENCRYPTION_KEY || "a".repeat(64);
                    const key = Buffer.from(rawKey, 'hex');
                    const iv = crypto.randomBytes(12);
                    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

                    let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
                    encrypted += cipher.final('hex');
                    const authTag = cipher.getAuthTag().toString('hex');

                    // Final payload string that goes into the image
                    const securePayload = `${iv.toString('hex')}:${authTag}:${encrypted}`;

                    await Steganography.embed(safeInputPath, safeOutputPath, securePayload);
                    console.log("[STEGO] Success! Saving metadata and updating certificate image...");

                    // Save to DB
                    await prisma.steganographyMetadata.create({
                        data: {
                            certificateId: id,
                            originalImage: certificate?.image_url || "",
                            stegoImage: publicStegoUrl,
                            algorithm: "LSB (RGB)",
                            encryptionAlgo: "AES-256-GCM", // Update to show encryption used
                            encryptionKey: "PROTECTED",
                            hashValue: hashValue, // Store the actual hash
                            createdBy: adminInfo.id,
                            lastVerified: new Date()
                        }
                    });

                    // SYNC: Update Certificate table image_url and stegoImageUrl to the new stego image
                    await prisma.$executeRawUnsafe(
                        `UPDATE "Certificate" SET "image_url" = $1, "stegoImageUrl" = $1 WHERE id = $2`,
                        publicStegoUrl,
                        id
                    );

                    console.log("[STEGO] Metadata saved and Certificate image synchronized.");
                } catch (stegoError) {
                    console.error("[STEGO] Embedding failed:", stegoError);
                }
            } else {
                console.log("[STEGO] Metadata already exists. Skipping.");
            }
        }
        // ---------------------------------------------------------

        if (shouldCreateLog && certificate) {
            // Create notification for user
            console.log("[ACTION] Creating Notification...")
            await prisma.notification.create({
                data: {
                    userId: certificate.ownerId,
                    certificateId: id,
                    title: status === "VERIFIED" ? "Sertifikat Diverifikasi" : "Sertifikat Ditolak",
                    message: status === "VERIFIED"
                        ? `Sertifikat ${certificate.nama_lahan} (${certificate.nomor_sertifikat}) telah diverifikasi oleh admin.`
                        : `Sertifikat ${certificate.nama_lahan} (${certificate.nomor_sertifikat}) ditolak. Alasan: ${note || "Ketidaksesuaian data"}`,
                    type: status === "VERIFIED" ? "CERTIFICATE_VERIFIED" : "CERTIFICATE_REJECTED",
                },
            })

            // Create admin audit log
            console.log("[ACTION] Creating Audit Log...")
            try {
                await prisma.adminAuditLog.create({
                    data: {
                        adminId: adminInfo.id,
                        action: status === "VERIFIED" ? "APPROVE_CERT" : "REJECT_CERT",
                        targetType: "Certificate",
                        targetId: id,
                        details: {
                            certificateNumber: certificate.nomor_sertifikat,
                            action: status.toLowerCase(),
                            note: note || "",
                        },
                    },
                })
            } catch (auditError) {
                console.warn("[ACTION] Failed to create audit log (non-fatal):", auditError);
            }
        }

        console.log("[ACTION] Revalidating paths...")
        revalidatePath("/admin/persetujuan")
        revalidatePath("/admin/dashboard")
        revalidatePath(`/sertifikat/${id}`)

        return { success: true, certificate };
    } catch (error) {
        console.error("Update certificate status error:", error);
        return { error: "Gagal memperbarui status sertifikat: " + (error as Error).message };
    }
}

export async function getAdminHistory() {
    try {
        console.log("[QUERY] Fetching admin history via RAW SQL...")
        const rows = await prisma.$queryRawUnsafe(`
            SELECT h.id, h."certificateId", h.actor_name, h.actor_email, h.action, h.note, h."createdAt",
                   h.owner_name, h.owner_email,
                   c.nomor_sertifikat as "certNo", c.nama_lahan, c.status as "certStatus",
                   u.name as "creatorName", u.email as "creatorEmail"
            FROM "History" h
            JOIN "Certificate" c ON h."certificateId" = c.id
            JOIN "User" u ON c."ownerId" = u.id
            WHERE c."nomor_sertifikat" NOT LIKE '%_REJECTED_%' 
            AND c."nomor_sertifikat" NOT LIKE '%_PENDING_OVERWRITE_%'
            ORDER BY h."createdAt" DESC
        `) as any[];

        const history = rows.map(r => ({
            ...r,
            owner_name: r.owner_name || r.creatorName || "Unknown",
            owner_email: r.owner_email || r.creatorEmail || "Unknown",
            certificate: {
                id: r.certificateId,
                nomor_sertifikat: r.certNo,
                nama_lahan: r.nama_lahan,
                status: r.certStatus,
                owner: {
                    name: r.creatorName || "Unknown",
                    email: r.creatorEmail || "Unknown"
                }
            }
        }));

        return { success: true, history };
    } catch (error) {
        console.error("Admin history resilient error:", error);
        return { error: "Gagal mengambil riwayat" };
    }
}

export async function getHistoryDetail(historyId: string) {
    try {
        console.log(`[QUERY] Fetching history detail for ${historyId}...`)

        // 1. Get the history record
        const historyRecord = await prisma.history.findUnique({
            where: { id: historyId },
            include: {
                certificate: {
                    include: {
                        owner: true,
                        history: {
                            orderBy: { createdAt: "desc" }
                        }
                    }
                }
            }
        });

        if (!historyRecord) {
            return { error: "Catatan riwayat tidak ditemukan" };
        }

        return { success: true, history: historyRecord };
    } catch (error) {
        console.error("Get history detail error:", error);
        return { error: "Gagal mengambil detail riwayat" };
    }
}

export async function getCertificateById(id: string) {
    try {
        console.log(`[QUERY] Fetching certificate ${id} via RAW SQL...`)
        // 1. Fetch main certificate data
        const certs = await prisma.$queryRawUnsafe(
            `SELECT c.*, u.email as "ownerEmail", u.name as "ownerName" 
             FROM "Certificate" c 
             JOIN "User" u ON c."ownerId" = u.id 
             WHERE c.id = $1 LIMIT 1`,
            id
        ) as any[]

        if (!certs || certs.length === 0) {
            return { error: "Sertifikat tidak ditemukan" }
        }

        const cert = certs[0]

        // 2. Fetch History
        const history = await prisma.$queryRawUnsafe(
            `SELECT * FROM "History" WHERE "certificateId" = $1 ORDER BY "createdAt" DESC`,
            id
        ) as any[]

        // 3. Fetch SteganographyMetadata
        const meta = await prisma.$queryRawUnsafe(
            `SELECT * FROM "SteganographyMetadata" WHERE "certificateId" = $1 LIMIT 1`,
            id
        ) as any[]

        // Reconstruct the expected object structure
        const formattedCert = {
            ...cert,
            owner: {
                id: cert.ownerId,
                name: cert.ownerName,
                email: cert.ownerEmail
            },
            history: history || [],
            steganographyMetadata: meta && meta.length > 0 ? meta[0] : null
        }

        return { success: true, certificate: formattedCert };

    } catch (error) {
        console.error("Get certificate resilient error:", error);
        return { error: "Database Error: " + (error as Error).message };
    }
}

// New helper functions for notifications
export async function getUserNotifications(userId: string) {
    try {
        console.log(`[ACTION] Fetching notifications for ${userId} via RAW SQL...`)

        // Use Raw SQL to be resilient against enum sync issues
        const notifications = await prisma.$queryRawUnsafe(
            `SELECT n.*, 
                    c.nama_lahan as "certName", c.nomor_sertifikat as "certNo"
             FROM "Notification" n
             LEFT JOIN "Certificate" c ON n."certificateId" = c.id
             WHERE n."userId" = $1
             AND (c.id IS NULL OR (c."nomor_sertifikat" NOT LIKE '%_REJECTED_%' AND c."nomor_sertifikat" NOT LIKE '%_PENDING_OVERWRITE_%'))
             ORDER BY n."createdAt" DESC`,
            userId
        ) as any[]

        console.log(`[ACTION] Found ${notifications.length} notifications for ${userId}`)

        return { success: true, notifications }
    } catch (error) {
        console.error("Get notifications error (Raw):", error)
        return { error: "Gagal mengambil notifikasi" }
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const notification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        })

        return { success: true, notification }
    } catch (error) {
        console.error("Mark notification as read error:", error)
        return { error: "Gagal menandai notifikasi" }
    }
}

export async function markAllNotificationsAsRead(userId: string) {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: userId,
                isRead: false,
            },
            data: { isRead: true },
        })

        return { success: true }
    } catch (error) {
        console.error("Mark all notifications as read error:", error)
        return { error: "Gagal menandai semua notifikasi" }
    }
}

// Notification helpers

export async function verifyCertificateImage(formData: FormData) {
    console.log("[VERIFY] Starting verification process...");
    try {
        const file = formData.get("file") as File;
        if (!file || file.size === 0) {
            return { error: "File tidak valid" };
        }

        // 1. Save file to temp location
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempDir = path.join(process.cwd(), "public", "uploads", "temp");
        await mkdir(tempDir, { recursive: true });

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const tempFilePath = path.join(tempDir, `verify_${timestamp}_${safeName}`);

        await writeFile(tempFilePath, buffer);
        console.log(`[VERIFY] File saved to ${tempFilePath}`);

        // 2. Reveal data using Node.js Steganography
        let revealedMessage: string;
        try {
            revealedMessage = await Steganography.reveal(tempFilePath);
            console.log(`[VERIFY] Revealed Message: ${revealedMessage}`);
        } catch (stegoError) {
            console.error("[VERIFY] Steganography reveal failed:", stegoError);
            return { error: "Tidak ditemukan data tersembunyi. Sertifikat mungkin bukan asli atau gambar telah dimodifikasi." };
        } finally {
            // Cleanup temp file
            try {
                await unlink(tempFilePath);
            } catch (e) {
                console.error("[VERIFY] Failed to cleanup temp file:", e);
            }
        }

        // 3. Decrypt/Parse Hidden Message
        let hiddenData;
        try {
            // Try parse as plain JSON first (for legacy/unencrypted support)
            hiddenData = JSON.parse(revealedMessage);
        } catch (e) {
            // If failed, check if it's encrypted (IV:AuthTag:Ciphertext format)
            console.log("[VERIFY] Not plain JSON, checking for AES encryption...");
            try {
                const parts = revealedMessage.split(':');
                if (parts.length === 3) {
                    const [ivHex, authTagHex, encryptedHex] = parts;
                    const rawKey = process.env.ENCRYPTION_KEY || "a".repeat(64);
                    const key = Buffer.from(rawKey, 'hex');
                    const iv = Buffer.from(ivHex, 'hex');
                    const authTag = Buffer.from(authTagHex, 'hex');

                    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
                    decipher.setAuthTag(authTag);

                    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
                    decrypted += decipher.final('utf8');
                    hiddenData = JSON.parse(decrypted);
                    console.log("[VERIFY] AES Decryption success.");
                } else {
                    throw new Error("Invalid format");
                }
            } catch (decryptErr) {
                console.error("[VERIFY] Decryption/Parse failed:", decryptErr);
                return {
                    error: "FAIL_DECRYPT_OR_PARSE",
                    message: "Gagal memproses data sertifikat. Gambar mungkin rusak atau menggunakan kunci enkripsi yang berbeda."
                };
            }
        }

        console.log("[VERIFY] Extracted Data:", hiddenData);
        const { certId, ownerId, serial } = hiddenData;

        if (!certId) {
            return { error: "Data sertifikat tidak lengkap dalam gambar." };
        }

        // 5. Verify against Database
        const certificate = await prisma.certificate.findUnique({
            where: { id: certId },
            include: {
                owner: true,
                history: { orderBy: { createdAt: "desc" } },
                steganographyMetadata: true // Include metadata to check hash
            }
        });

        if (!certificate) {
            return { error: "Sertifikat tidak ditemukan di database (ID tidak valid)." };
        }

        // Check if data matches
        // 1. Serial Check
        if (certificate.nomor_sertifikat !== serial) {
            return {
                error: "Data tidak cocok! Nomor sertifikat dalam gambar berbeda dengan database.",
                details: {
                    imageSerial: serial,
                    dbSerial: certificate.nomor_sertifikat
                }
            };
        }

        // 2. Ownership Check (Detect Stale/Transferred Image)
        const isOwnerMatch = certificate.ownerId === ownerId;
        const imageOwnerName = hiddenData.ownerName || "Tidak diketahui";

        console.log(`[VERIFY] Ownership Check: 
            Image Owner ID: ${ownerId}
            DB Owner ID: ${certificate.ownerId}
            Match: ${isOwnerMatch}
        `);

        // 3. Hash Integrity Check (Digital Signature)
        const dbHash = certificate.steganographyMetadata?.hashValue;

        // Recalculate hash from the hidden data to ensure it hasn't been tampered with
        const recalculatedHash = crypto.createHash('sha256').update(JSON.stringify(hiddenData)).digest('hex');

        console.log(`[VERIFY] Integrity Check:
            Extract Hash: ${recalculatedHash}
            Database Hash: ${dbHash}
        `);

        if (dbHash && dbHash !== recalculatedHash) {
            if (!isOwnerMatch) {
                // If hash doesn't match AND owner is different, it's just an old/outdated certificate
                console.log("[VERIFY] Hash mismatch detected, but ownership also differs. Treating as OUTDATED.");
            } else {
                // If hash doesn't match BUT owner is the same, it's likely intentional tampering
                console.warn("[VERIFY] Integrity breach detected on current owner's image!");
                return {
                    error: "TAMPER_DETECTED",
                    message: "Peringatan Keamanan: Segel digital tidak valid. Data dalam gambar ini terdeteksi telah dimodifikasi secara ilegal."
                };
            }
        }

        // Success!
        // Privacy Protection: Only show full details if owner matches the stego image
        const displayOwnerName = isOwnerMatch ? (certificate.owner.name || certificate.owner.email) : "Terproteksi (Pemilik Telah Berubah)";
        const displayOwnerEmail = isOwnerMatch ? certificate.owner.email : "Privasi Dilindungi";

        // Filter history: Only show history if it's the current owner
        const displayHistory = isOwnerMatch ? certificate.history : [];

        const adminHistory = displayHistory.map((h: any) => ({
            name: h.owner_name || h.actor_name,
            email: h.owner_email || h.actor_email,
            type: h.action, // Verifikasi/Penolakan
            date: new Date(h.createdAt).toLocaleDateString("id-ID"),
            note: h.note
        }));

        return {
            success: true,
            isOwnerMatch,
            imageOwnerName,
            ownerName: displayOwnerName, // This will be used for the current owner display
            ownerEmail: displayOwnerEmail,
            status: certificate.status,
            transferToEmail: certificate.transferToEmail,
            certificate: {
                nama: certificate.nama_lahan,
                nomor: certificate.nomor_sertifikat,
                luas: certificate.luas_tanah,
                location: certificate.lokasi,
                keterangan: certificate.keterangan,
                ownerName: displayOwnerName,
                ownerEmail: displayOwnerEmail,
                status: certificate.status,
                history: adminHistory
            }
        };

    } catch (error) {
        console.error("Verification error:", error);
        return { error: "Terjadi kesalahan sistem saat verifikasi." };
    }
}

export async function deleteCertificate(certId: string) {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value

    if (!sessionValue) return { error: "Silakan login terlebih dahulu" }

    try {
        const session = JSON.parse(sessionValue)
        const userId = session.id

        // 1. Find Certificate
        const cert = await prisma.certificate.findUnique({
            where: { id: certId }
        })

        if (!cert) return { error: "Sertifikat tidak ditemukan" }

        // 2. Check Ownership
        if (cert.ownerId !== userId) {
            return { error: "Anda tidak memiliki akses untuk menghapus sertifikat ini" }
        }

        // 3. Check Status (Only REJECTED can be deleted by user for now, as requested)
        if (cert.status !== "REJECTED") {
            return { error: "Hanya sertifikat yang ditolak yang dapat dihapus" }
        }

        // 4. Delete
        // Depending on schema, we might need to delete related records first or rely on Cascade
        // Assuming Cascade is set or we delete main record. 
        // We will try deleting the certificate directly.
        await prisma.certificate.delete({
            where: { id: certId }
        })

        // Optional: Delete image file from FS if needed, but for now DB deletion is sufficient.

        return { success: true }
    } catch (error) {
        console.error("Delete certificate error:", error)
        return { error: "Gagal menghapus sertifikat" }
    }
}
