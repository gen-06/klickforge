import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/toast";
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
  title: "ClipForge — Turn Long Videos Into Short-Form Clips",
  description:
    "ClipForge auto-crops your long-form video into vertical clips with burned-in captions, ready for TikTok, Instagram Reels, and YouTube Shorts.",
  keywords: [
    "video clipping",
    "short form video",
    "TikTok clips",
    "Instagram Reels",
    "YouTube Shorts",
    "video editor",
    "video repurposing",
    "automatic captions",
    "video translation",
  ],
  authors: [{ name: "ClipForge" }],
  openGraph: {
    title: "ClipForge — Turn Long Videos Into Short-Form Clips",
    description:
      "Upload your long-form videos and automatically crop, caption, and translate them into vertical clips ready to post.",
    type: "website",
    siteName: "ClipForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipForge — Turn Long Videos Into Short-Form Clips",
    description:
      "Upload your long-form videos and automatically crop, caption, and translate them into vertical clips ready to post.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const theme = localStorage.getItem('theme');
                    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
