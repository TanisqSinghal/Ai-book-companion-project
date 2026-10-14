import type { Metadata } from "next";
import { IBM_Plex_Serif, Mona_Sans} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import Navbar from "@/components/Navbar";
import CosmicBackground from "@/components/CosmicBackground";
import "./globals.css";
import {Toaster} from "@/components/ui/sonner";

const ibmPlexSerif = IBM_Plex_Serif({
    variable: "--font-ibm-plex-serif",
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap'
});

const monaSans = Mona_Sans({
    variable: '--font-mona-sans',
    subsets: ['latin'],
    display: 'swap'
})

// Matches Clerk's sign-in, account and pricing widgets to the dark theme in globals.css
const clerkAppearance = {
    variables: {
        colorPrimary: '#ffb454',
        colorPrimaryForeground: '#1a0f02',
        colorBackground: '#0f1730',
        colorForeground: '#f2f5fb',
        colorMutedForeground: '#a9b4cc',
        colorMuted: '#18233f',
        colorInput: '#111a36',
        colorInputForeground: '#f2f5fb',
        colorNeutral: '#ffffff',
        colorBorder: 'rgba(255, 255, 255, 0.16)',
    },
};

export const metadata: Metadata = {
  title: "Lumora",
  description: "Transform your books into interactive AI conversations. Upload PDFs, and chat with your books using voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
        <html lang="en">
          <body
            className={`${ibmPlexSerif.variable} ${monaSans.variable} relative font-sans antialiased`}
          >
            <CosmicBackground />
            <Navbar />
            {children}
            <Toaster />
          </body>
        </html>
    </ClerkProvider>
  );
}