import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Provider } from "jotai";
import { type ReactNode, Suspense } from "react";
import { AuthProvider } from "@/components/auth/provider";
import { GitHubStarsLoader } from "@/components/github-stars-loader";
import { GitHubStarsProvider } from "@/components/github-stars-provider";
import { GlobalModals } from "@/components/global-modals";
import { OverlayProvider } from "@/components/overlays/overlay-provider";
import { PrivyAppProvider } from "@/components/privy/privy-app-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LayoutContent } from "@/components/layout-content";
import { WorkflowExtensionsLoader } from "@/components/workflow/extensions-loader";
import { mono } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Inter, Instrument_Sans } from "next/font/google";

const instrumentSansHeading = Instrument_Sans({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Graphitti",
    template: "%s | Graphitti",
  },
  description:
    "Build and run AI workflows with wallets, plugins, and a public marketplace.",
  icons: {
    icon: [
      {
        url: "/favicon-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark.png",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/favicon-light.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable, instrumentSansHeading.variable)}>
    <body className={cn(inter.variable, instrumentSansHeading.variable, mono.variable, "antialiased")}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <Provider>
          <PrivyAppProvider>
          <AuthProvider>
            <OverlayProvider>
              <WorkflowExtensionsLoader />
              <Suspense
                fallback={
                  <GitHubStarsProvider stars={null}>
                    <LayoutContent>{children}</LayoutContent>
                  </GitHubStarsProvider>
                }
              >
                <GitHubStarsLoader>
                  <LayoutContent>{children}</LayoutContent>
                </GitHubStarsLoader>
              </Suspense>
              <Toaster />
              <GlobalModals />
            </OverlayProvider>
          </AuthProvider>
          </PrivyAppProvider>
        </Provider>
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </body>
  </html>
);

export default RootLayout;
