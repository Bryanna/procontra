import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getCurrentStaffView } from "@/infrastructure/supabase/staff-identity-server";
import { themeBootScript } from "@/shared/theme/prepaint-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PROCONTRA | Farmacia La Línea",
  description: "Plataforma de continuidad de tratamiento, inventario y atención al paciente.",
  applicationName: "PROCONTRA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PROCONTRA",
  },
  icons: {
    icon: "/brand/app-icon-192.png",
    apple: "/brand/app-icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e667d" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1418" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const identity = await getCurrentStaffView();
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppShell identity={identity}>{children}</AppShell>
      </body>
    </html>
  );
}
