import { Suspense } from "react";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
    return (
        <Suspense fallback={<div>Loading history...</div>}>
            <HistoryClient />
        </Suspense>
    );
}
