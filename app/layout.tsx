import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const vazirmatn = localFont({
  src: "../public/fonts/Vazirmatn.woff2",
  display: "swap",
  variable: "--font-vazirmatn",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "هم‌قدم — قبل از رفتن، مطمئن شو",
  description:
    "دستیار خرید حضوری: قیمت، موجودی تأییدشده، ساعت کاری و برنامه سفر به فروشگاه‌های تهران.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f4f1ea",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>{children}</body>
    </html>
  );
}
