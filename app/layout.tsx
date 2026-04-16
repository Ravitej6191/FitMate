import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "FitMate — Gym Tracker",
  description: "Premium gym routine tracking app. Plan your week, track daily habits, and stay consistent.",
  manifest: "/manifest.json",

  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",  // lets the dark splash bg show through
    title: "FitMate",
  },

  // Open Graph (social share preview)
  openGraph: {
    title: "FitMate — Gym Tracker",
    description: "Premium gym routine tracking app. Plan your week, track daily habits.",
    type: "website",
    siteName: "FitMate",
  },

  // Allows Chrome on Android to use the theme-color for the address bar
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",               // enables safe-area-inset for notched phones
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1B3320" },
    { media: "(prefers-color-scheme: dark)",  color: "#1B3320" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark background on <html> matches the splash and the body CSS rule.
    // On wide screens (tablet/desktop) this shows in the gutters outside the
    // 480px centred body — dark looks intentional, light-green looked broken.
    <html lang="en" style={{ background: '#0B1A0B' }}>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
