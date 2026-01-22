import { Suspense } from "react";
import ApprovalClient from "./ApprovalClient";

export const dynamic = "force-dynamic";

export default function ApprovalPage() {
    return (
        <Suspense fallback={<div>Loading approvals...</div>}>
            <ApprovalClient />
        </Suspense>
    );
}
