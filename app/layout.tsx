import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ui/toast";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

export const metadata: Metadata = {
  title: "Ravia Farms — Precision Management",
  description:
    "Precision agricultural management for poultry, vertical vegetables, rabbitry, and canine breeding.",
  manifest: "/manifest.json",
  applicationName: "Ravia Farms",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ravia Farms",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="bg-body text-white">
        <Providers>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
