import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import "./admin.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RaveSoft Admin",
  robots: { index: false, follow: false },
};

/**
 * Independent root layout for /admin — deliberately does NOT include the
 * marketing site's Header/Footer/ChatWidget. Next.js treats
 * this as a separate root because the marketing routes live under the
 * (marketing) route group with their own root layout.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="admin-shell min-h-full antialiased">{children}</body>
    </html>
  );
}
