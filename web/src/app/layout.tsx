import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jain Sarathi — Office of Academics", template: "%s · Jain Sarathi" },
  description: "Semester Readiness and Semester Closure portal, Office of Academics, JAIN (Deemed-to-be University).",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/jgi-icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0a2558" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
