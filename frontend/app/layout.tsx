import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scout — Evidence-backed startup research",
  description:
    "Scout runs a team of specialist AI analysts over your startup idea and returns a scored, cited verdict.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#100e0c" },
  ],
  width: "device-width",
  initialScale: 1,
  // Extend content under the notch / home indicator so safe-area insets apply.
  viewportFit: "cover",
};

const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("scout:theme");var d=c==="dark"||((c==="system"||!c)&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/*
            Runs before first paint so a dark-theme visitor never sees a white
            flash. Kept inline and dependency-free for exactly that reason.
          */}
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        </head>
        <body
          className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
