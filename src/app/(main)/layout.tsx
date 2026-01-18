import { Navbar } from "@/components/Navbar";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen relative">
            {/* Animated Gradient Background */}
            <div
                className="fixed inset-0 -z-10 animated-gradient"
                style={{
                    backgroundImage: 'url(/bg-main.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            />

            <Navbar />
            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
}
