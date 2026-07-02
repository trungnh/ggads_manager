import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Ads Manager",
  description: "Google Ads Manager với AI",
};

import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProviderCustomizer } from "@/components/providers/ThemeProviderCustomizer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })()
            `
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <SessionProvider>
          <ThemeProviderCustomizer>
            {children}
          </ThemeProviderCustomizer>
        </SessionProvider>
      </body>
    </html>
  );
}
