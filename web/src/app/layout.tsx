import type { Metadata, Viewport } from "next";
import "@fontsource-variable/roboto";
import "@fontsource/roboto-mono/500.css";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jain OOA Portal — Office of Academic Affairs", template: "%s · Jain OOA Portal" },
  description: "Semester Readiness and Semester Closure portal of the Office of Academic Affairs, JAIN (Deemed-to-be University).",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/jgi-icon-192.png" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#15181d" },
  ],
};

// Sets light or dark before the page paints, so it never flashes the wrong theme.
// Uses the visitor's choice if they made one, otherwise their device setting.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("ooa:theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
