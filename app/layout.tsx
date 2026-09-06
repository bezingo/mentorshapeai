import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "@/styles/globals.css";

// BoardUI's type scale resolves --font-inter (see styles/theme.css); the
// legacy shadcn layer maps its --font-sans to the same variable.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MentorShape AI",
  description: "MentorShape AI Application",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MentorShape",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Restore the persisted BoardUI theme before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("boardui:theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <I18nProvider>
          <ServiceWorkerRegistration />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
