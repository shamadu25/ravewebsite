import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";

export const metadata: Metadata = {
  title: {
    default: "RaveSoft Digital Solutions | Software Company in Ghana, Nigeria, Kenya & Africa",
    template: "%s | RaveSoft Digital Solutions",
  },
  description:
    "RaveSoft Digital Solutions — software company based in Ghana, building websites, custom software, SaaS platforms, POS systems, ERP solutions, mobile apps, and automation for businesses in Ghana, Nigeria, Kenya, South Africa, Ivory Coast, Senegal, Tanzania, Uganda, Ethiopia, Rwanda, Cameroon, and across all 54 African countries.",
  keywords: [
    // Ghana
    "software company in Ghana",
    "software development company in Ghana",
    "website design company in Ghana",
    "custom software development Ghana",
    "SaaS development company Ghana",
    "POS software Ghana",
    "ERP software Ghana",
    "business automation Ghana",
    "mobile app development Ghana",
    "IT company in Ghana",
    "web development company Accra",
    "tech company Ghana",
    // Nigeria
    "software company in Nigeria",
    "software development Nigeria",
    "website design Nigeria",
    "custom software Nigeria",
    "POS software Nigeria",
    "ERP software Nigeria",
    "mobile app development Nigeria",
    "tech company Nigeria",
    "IT company Lagos",
    // Kenya
    "software company in Kenya",
    "software development Kenya",
    "website design Nairobi",
    "custom software Kenya",
    "mobile app development Kenya",
    "tech company Nairobi",
    // South Africa
    "software company South Africa",
    "software development South Africa",
    "custom software Johannesburg",
    "mobile app development South Africa",
    // Ivory Coast / Côte d'Ivoire
    "software company Ivory Coast",
    "software company Côte d'Ivoire",
    "développement logiciel Côte d'Ivoire",
    "création de site web Abidjan",
    // Senegal
    "software company Senegal",
    "développement logiciel Sénégal",
    "création de site web Dakar",
    // Tanzania
    "software company Tanzania",
    "software development Dar es Salaam",
    "mobile app development Tanzania",
    // Uganda
    "software company Uganda",
    "software development Kampala",
    "tech company Uganda",
    // Ethiopia
    "software company Ethiopia",
    "software development Addis Ababa",
    "IT company Ethiopia",
    // Rwanda
    "software company Rwanda",
    "software development Kigali",
    "tech company Rwanda",
    // Cameroon
    "software company Cameroon",
    "développement logiciel Cameroun",
    // General Africa
    "African software company",
    "software development company Africa",
    "best software company in Africa",
    "SaaS development Africa",
    "ERP software Africa",
    "POS software Africa",
    "business automation Africa",
    "digital transformation Africa",
    "mobile app development Africa",
    "website design Africa",
    "custom software development Africa",
  ],
  authors: [{ name: "RaveSoft Digital Solutions Ltd" }],
  creator: "RaveSoft Digital Solutions Ltd",
  publisher: "RaveSoft Digital Solutions Ltd",
  icons: {
    icon: [
      { url: "/img/logo.png", type: "image/png" },
    ],
    apple: "/img/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ravesoftsolutions.com",
    siteName: "RaveSoft Digital Solutions",
    title: "RaveSoft Digital Solutions | Software Company in Ghana, Nigeria, Kenya & Africa",
    description:
      "RaveSoft Digital Solutions builds websites, custom software, SaaS, POS, ERP, mobile apps and automation for businesses in Ghana, Nigeria, Kenya, South Africa, Ivory Coast, Senegal, Tanzania, Uganda, Ethiopia, Rwanda, Cameroon and all 54 African countries.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "RaveSoft Digital Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RaveSoft Digital Solutions | Software Company in Ghana, Nigeria, Kenya & Africa",
    description:
      "Premium software, SaaS, POS, ERP, mobile apps and business automation for businesses in Ghana, Nigeria, Kenya, South Africa, Ivory Coast, Senegal, Rwanda, Uganda, Tanzania, Ethiopia, Cameroon and across Africa.",
    creator: "@ravesoftsolutions",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-white text-gray-900">
        <OrganizationSchema />
        <GoogleAnalytics />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
