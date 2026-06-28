import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "Posterium - Stremio Poster Manager",
  description: "Custom poster manager for Stremio via AIOmetadata",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.themoviedb.org" />
      </head>
      <body className="min-h-full">{children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#ff6430",
              color: "white",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(255, 100, 48, 0.3)",
              border: "none",
            },
          }}
          duration={2500}
          closeButton={false}
          richColors={false}
          theme="dark"
        />
      </body>
    </html>
  );
}
