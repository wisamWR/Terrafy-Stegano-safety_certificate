import { redirect } from "next/navigation";

export default function AdminPage() {
    // Redirect to admin dashboard
    redirect("/admin/dashboard");
}
