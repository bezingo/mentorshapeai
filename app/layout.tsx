import type { Metadata } from "next";
import { Instrument_Sans, DM_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "@/styles/globals.css";

// Mentorshape design system fonts:
// - Instrument Sans for display and UI
// - DM Mono for numbers, times, prices
// - IBM Plex Sans Arabic for Arabic content

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["400", "500"],
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Keep Inter as fallback for BoardUI compatibility (--font-inter)
const interFallback = "--font-inter";

export const metadata: Metadata = {
  title: "Mentorshape",
  description: "Grow with someone who has done it. AI takes the notes. You keep the conversation.",
  manifest: "/manifest.json",
  themeColor: "#1a1550",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mentorshape",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${dmMono.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Restore the persisted theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("boardui:theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider>
          <ServiceWorkerRegistration />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
