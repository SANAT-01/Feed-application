import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";
import AppShell from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

export const metadata = {
  title: "Feed",
  description: "See what your friends are up to.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
