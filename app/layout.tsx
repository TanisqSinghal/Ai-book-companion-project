import type { Metadata } from "next";
import { IBM_Plex_Serif, Mona_Sans } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

import "./globals.css";
import Navbar from "@/components/ui/Navbar";

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap'
});

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  display: 'swap'
})

export const metadata: Metadata = {
  title: "libroAi",
  description: "Transform your books into interactive AI companions with libroAi. Our platform allows you to upload your books and create personalized AI chatbots that can engage in dynamic conversations, answer questions, and provide insights based on the content of your books. Whether you're an author looking to enhance reader engagement or a reader seeking a more interactive experience, libroAi is the perfect solution to bring your books to life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSerif.variable} ${monaSans.variable} relative font-sans antialiased`}
      >
        <ClerkProvider>
          <Navbar />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
