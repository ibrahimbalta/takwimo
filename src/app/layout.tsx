import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://takwimo.vercel.app").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "TAKWİMO — WhatsApp Business & Google Calendar Randevu Platformu",
    template: "%s | TAKWİMO",
  },
  description:
    "WhatsApp'tan gelen her mesajı çakışmasız randevuya dönüştürün. Tek gelen kutusu, iki yönlü Google Calendar senkronizasyonu ve otomatik WhatsApp hatırlatmaları — klinikler, salonlar ve randevulu işletmeler için.",
  keywords: [
    "TAKWİMO",
    "WhatsApp randevu sistemi",
    "WhatsApp Business API",
    "Google Calendar entegrasyonu",
    "klinik randevu yönetimi",
    "otomatik WhatsApp hatırlatma",
    "ortak WhatsApp gelen kutusu",
    "randevu takip programı",
    "KVKK uyumlu CRM",
  ],
  authors: [{ name: "TAKWİMO" }],
  creator: "TAKWİMO",
  publisher: "TAKWİMO",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: appUrl,
    siteName: "TAKWİMO",
    title: "TAKWİMO — WhatsApp Business & Google Calendar Randevu Platformu",
    description:
      "Tek gelen kutusu. Tek takvim. Tek ekip. Resmî Meta WhatsApp Cloud API, iki yönlü Google Calendar ve otomatik hatırlatmalarla randevularınızı tek ekrandan yönetin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TAKWİMO — WhatsApp Business & Google Calendar Randevu Platformu",
    description:
      "WhatsApp'tan gelen mesajları 3 saniyede çakışmasız Google Takvim randevusuna dönüştürün. Sonsuza dek ücretsiz başlangıç paketiyle deneyin.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
    <html lang="tr" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="theme-color" content="#059669" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
