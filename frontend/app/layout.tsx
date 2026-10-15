import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreHydrator, ThemeSync } from "@/components/common/providers";
import { Toaster } from "@/components/common/toaster";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { VoiceProvider } from "@/components/voice/voice-provider"; // ★ CHANGE 1: new import
import { catalogService } from "@/lib/container";
import { THEME_STORAGE_KEY } from "@/store/theme-store";
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
  title: {
    default: "Cartiva — Intelligent Grocery Shopping",
    template: "%s · Cartiva",
  },
  description: "Shop groceries by browsing or by voice. Fresh vegetables, fruits, dairy, essentials and more.",
};

/** Applies the saved theme before first paint (dark is the default), so there is no flash. */
const themeScript = `try{var t=JSON.parse(localStorage.getItem("${THEME_STORAGE_KEY}")||"null");t=t&&t.state&&t.state.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const categories = catalogService.getCategories();

  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {/* ★ CHANGE 2: one voice session for the whole site, so it survives page navigation */}
        <VoiceProvider>
          <StoreHydrator />
          <ThemeSync />
          <Header categories={categories} />
          <main id="main" className="mx-auto w-full max-w-[1920px] flex-1 px-4 py-6 sm:px-6 lg:px-10">
            {children}
          </main>
          <Footer categories={categories} />
          <Toaster />
        </VoiceProvider>
      </body>
    </html>
  );
}
