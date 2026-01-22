"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileCheck, FileClock, FileX, Users, TrendingUp } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { getAdminStats } from "@/lib/actions/certificates";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    PieChart,
    Pie,
    Label
} from 'recharts';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

const chartConfig = {
    total: {
        label: "Total Pengajuan",
        color: "#2563eb", // Blue 600
    },
} satisfies ChartConfig;

const pieConfig = {
    approved: {
        label: "Disetujui",
        color: "#22c55e",
    },
    pending: {
        label: "Pending",
        color: "#f59e0b",
    },
    rejected: {
        label: "Ditolak",
        color: "#ef4444",
    },
    transfer: {
        label: "Proses Transfer",
        color: "#9333ea",
    },
} satisfies ChartConfig;

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any[]>([]);
    const [pieChartData, setPieChartData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const result = await getAdminStats();
            if (result.success && result.stats) {
                const mappedStats = [
                    {
                        title: "Total Pengajuan",
                        value: result.stats.total.toString(),
                        description: "Semua pengajuan",
                        icon: FileCheck,
                        color: "text-blue-500",
                    },
                    {
                        title: "Total User",
                        value: result.stats.users.toString(),
                        description: "User aktif",
                        icon: Users,
                        color: "text-emerald-500",
                    },
                    {
                        title: "Disetujui",
                        value: result.stats.verified.toString(),
                        description: "Sertifikat terverifikasi",
                        icon: FileCheck,
                        color: "text-green-600",
                    },
                    {
                        title: "Menunggu Persetujuan",
                        value: result.stats.pending.toString(),
                        description: "Sertifikat baru",
                        icon: FileClock,
                        color: "text-amber-500",
                    },
                    {
                        title: "Ditolak",
                        value: result.stats.rejected.toString(),
                        description: "Total penolakan",
                        icon: FileX,
                        color: "text-red-500",
                    },
                    {
                        title: "Proses Transfer",
                        value: result.stats.transfer.toString(),
                        description: "Sedang dipindahkan",
                        icon: TrendingUp,
                        color: "text-purple-600",
                    },
                ];
                setStats(mappedStats);

                // Update fill colors to match our config keys
                const statusDataWithColors = (result.statusData || []).map((item: any) => ({
                    ...item,
                    fill: pieConfig[item.name as keyof typeof pieConfig]?.color || item.fill
                }));

                setPieChartData(statusDataWithColors);
                setTrendData(result.monthlyTrend || []);
            }
        };

        fetchStats();
    }, []);

    const pieTotal = useMemo(() => {
        return pieChartData.reduce((acc, curr) => acc + curr.value, 0);
    }, [pieChartData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Ringkasan Dashboard</h1>
                <p className="text-muted-foreground">Monitor statistik dan aktivitas transaksi sertifikat.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 w-full md:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="overflow-hidden bg-card hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-7">

                {/* Main Chart (Trend) */}
                <Card className="md:col-span-4 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                        <div className="space-y-1">
                            <CardTitle>Tren Pengajuan</CardTitle>
                            <CardDescription>
                                Jumlah pengajuan sertifikat per bulan
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <BarChart accessibilityLayer data={trendData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 4)}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                    width={40}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar
                                    dataKey="total"
                                    fill="var(--color-total)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Status Pie Chart */}
                <Card className="md:col-span-3 bg-card flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                        <div className="space-y-1">
                            <CardTitle>Status Persetujuan</CardTitle>
                            <CardDescription>
                                Distribusi status pengajuan
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                        <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[300px]">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie
                                    data={pieChartData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    strokeWidth={5}
                                >
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                return (
                                                    <text
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                    >
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                            className="fill-foreground text-3xl font-bold"
                                                        >
                                                            {pieTotal.toLocaleString()}
                                                        </tspan>
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy || 0) + 24}
                                                            className="fill-muted-foreground text-xs"
                                                        >
                                                            Total
                                                        </tspan>
                                                    </text>
                                                )
                                            }
                                        }}
                                    />
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

