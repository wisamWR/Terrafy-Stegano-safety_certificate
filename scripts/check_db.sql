SELECT id, "nama_lahan", status, "transferToEmail" FROM "Certificate" WHERE status = 'AWAITING_RECIPIENT';
SELECT n.id, u.email, n.title, n.type, n."createdAt" FROM "Notification" n JOIN "User" u ON n."userId" = u.id WHERE n.type = 'TRANSFER_REQUEST';
