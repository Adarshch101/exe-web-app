import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import RouteGuard from "@/components/RouteGuard";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen dark:bg-black`}
      >
        <Navbar />
        <RouteGuard>
          <Component {...pageProps} />
        </RouteGuard>
        <Toaster richColors position="top-right" />
      </div>
    </AuthProvider>
  );
}
