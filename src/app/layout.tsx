import type { Metadata } from "next";
import { Fragment } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { Toaster } from "react-hot-toast";
import AllOverlays from "@/app/components/AllOverlays";
import "@rainbow-me/rainbowkit/styles.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CroIgnite",
  description: "x402-powered creator sponsorships on Cronos.",
};

const themeScript = `
(() => {
  try {
    const storageKey = "croignite-theme";
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    // no-op
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders>
          <AllOverlays key="overlays" />
          <Fragment key="page-content">{children}</Fragment>
          <Toaster key="toaster" position="bottom-right" />
        </AppProviders>
      </body>
    </html>
  );
}
