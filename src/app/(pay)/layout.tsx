import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
export const metadata: Metadata = { title: "Secure payment — RaveSoft", robots: { index: false, follow: false } };

/** Independent root layout for buyer payment pages: no site chrome, nothing to distract from checkout. */
export default function PayRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
