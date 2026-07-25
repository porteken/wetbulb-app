import "./globals.css";

import { AppProviders } from "@/components/app/providers";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist } from "next/font/google";
import * as React from "react";

import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const IS_E2E_TEST_ENVIRONMENT =
  process.env.NEXT_PUBLIC_E2E_TEST === "true" ||
  process.env.PLAYWRIGHT_TEST === "1";

export const metadata: Metadata = {
  description: "Historical wet-bulb temperature data for US cities",
  title: "Historical Wetbulb App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("font-sans", geist.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen app-shell" suppressHydrationWarning>
        <AppProviders>
          {children}
          {!IS_E2E_TEST_ENVIRONMENT && <SpeedInsights />}
        </AppProviders>
        {!IS_E2E_TEST_ENVIRONMENT && <Analytics />}
      </body>
    </html>
  );
}
