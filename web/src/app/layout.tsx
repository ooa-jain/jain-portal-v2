import type { Metadata, Viewport } from "next";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
import "@fontsource/roboto-mono/500.css";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jain OOA Portal — Office of Academic Affairs", template: "%s · Jain OOA Portal" },
  description: "Semester Readiness, Semester Closure and Innovation & Emerging Areas portal of the Office of Academic Affairs, JAIN (Deemed-to-be University).",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/jgi-icon-192.png" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#0a2558" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
