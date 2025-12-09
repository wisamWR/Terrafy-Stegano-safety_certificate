"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileCheck, FileClock, FileX, Users, TrendingUp } from "lucide-react";
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

const stats = [
    {
        title: "Total Pengajuan",
        value: "142",
        description: "+20% dari bulan lalu",
        icon: FileCheck,
        color: "text-blue-500",
    },
    {
        title: "Menunggu Persetujuan",
        value: "12",
        description: "Perlu tindakan segera",
        icon: FileClock,
        color: "text-amber-500",
    },
    {
        title: "Ditolak",
        value: "8",
        description: "Total penolakan bulan ini",
        icon: FileX,
        color: "text-red-500",
    },
    {
        title: "Total User",
        value: "2,350",
        description: "+180 user baru",
        icon: Users,
        color: "text-emerald-500",
    },
    {
        title: "Total Persetujuan",
        value: "122",
        description: "Transaksi berhasil",
        icon: TrendingUp,
        color: "text-green-600",
    }
];

// Data Dummy Trends
const yearlyData = [
    { name: '2020', total: 450 },
    { name: '2021', total: 680 },
    { name: '2022', total: 920 },
    { name: '2023', total: 1100 },
    { name: '2024', total: 1420 },
];

const monthlyData = [
    { name: 'Jan', total: 65 },
    { name: 'Feb', total: 59 },
    { name: 'Mar', total: 80 },
    { name: 'Apr', total: 81 },
    { name: 'May', total: 56 },
    { name: 'Jun', total: 55 },
    { name: 'Jul', total: 40 },
    { name: 'Aug', total: 100 },
    { name: 'Sep', total: 110 },
    { name: 'Oct', total: 125 },
    { name: 'Nov', total: 130 },
    { name: 'Dec', total: 142 },
];

const weeklyData = [
    { name: 'Sen', total: 12 },
    { name: 'Sel', total: 18 },
    { name: 'Rab', total: 15 },
    { name: 'Kam', total: 22 },
    { name: 'Jum', total: 20 },
    { name: 'Sab', total: 8 },
    { name: 'Min', total: 5 },
];

// Data Dummy Status
const yearlyStatusData = [
    { name: 'approved', value: 1250, fill: "var(--color-approved)" },
    { name: 'pending', value: 120, fill: "var(--color-pending)" },
    { name: 'rejected', value: 80, fill: "var(--color-rejected)" },
];

const monthlyStatusData = [
    { name: 'approved', value: 122, fill: "var(--color-approved)" },
    { name: 'pending', value: 12, fill: "var(--color-pending)" },
    { name: 'rejected', value: 8, fill: "var(--color-rejected)" },
];

const weeklyStatusData = [
    { name: 'approved', value: 25, fill: "var(--color-approved)" },
    { name: 'pending', value: 5, fill: "var(--color-pending)" },
    { name: 'rejected', value: 2, fill: "var(--color-rejected)" },
];

const chartConfig = {
    total: {
        label: "Total Pengajuan",
        color: "#2563eb", // Blue 600
    },
} satisfies ChartConfig;

const pieConfig = {
    approved: {
        label: "Disetujui",
        color: "#22c55e", // Green 500
    },
    pending: {
        label: "Pending",
        color: "#f59e0b", // Amber 500
    },
    rejected: {
        label: "Ditolak",
        color: "#ef4444", // Red 500
    },
} satisfies ChartConfig;

export default function AdminDashboardPage() {
    const [timeRange, setTimeRange] = useState("monthly");
    const [pieTimeRange, setPieTimeRange] = useState("monthly");

    const getChartData = () => {
        switch (timeRange) {
            case "yearly":
                return yearlyData;
            case "weekly":
                return weeklyData;
            case "monthly":
            default:
                return monthlyData;
        }
    };

    const getChartTitle = () => {
        switch (timeRange) {
            case "yearly":
                return "Jumlah pengajuan sertifikat per tahun";
            case "weekly":
                return "Jumlah pengajuan sertifikat minggu ini";
            case "monthly":
            default:
                return "Jumlah pengajuan sertifikat per bulan";
        }
    };

    const getPieChartData = () => {
        switch (pieTimeRange) {
            case "yearly":
                return yearlyStatusData;
            case "weekly":
                return weeklyStatusData;
            case "monthly":
            default:
                return monthlyStatusData;
        }
    };

    const pieChartData = getPieChartData();
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
            <div className="grid gap-4 w-full md:grid-cols-2 lg:grid-cols-5">
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
                                {getChartTitle()}
                            </CardDescription>
                        </div>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[120px]" aria-label="Select time range">
                                <SelectValue placeholder="Pilih periode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yearly">Pertahun</SelectItem>
                                <SelectItem value="monthly">Perbulan</SelectItem>
                                <SelectItem value="weekly">Perminggu</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <BarChart accessibilityLayer data={getChartData()}>
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
                        <Select value={pieTimeRange} onValueChange={setPieTimeRange}>
                            <SelectTrigger className="w-[120px]" aria-label="Select time range">
                                <SelectValue placeholder="Pilih periode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yearly">Pertahun</SelectItem>
                                <SelectItem value="monthly">Perbulan</SelectItem>
                                <SelectItem value="weekly">Perminggu</SelectItem>
                            </SelectContent>
                        </Select>
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

