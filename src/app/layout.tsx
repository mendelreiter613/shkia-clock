import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Shkia Clock",
  description: "Countdown to Sunset",
  // Lets iOS open the home-screen version full screen, which is also what
  // enables web push there.
  appleWebApp: { capable: true, title: "Shkia Clock", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable}`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
