import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
    title: "Stats · Shkia Trusher",
    description: "How many people use Shkia Trusher, where they're from, and how the games are going.",
};

export default function StatsPage() {
    return <AdminDashboard mode="public" />;
}
