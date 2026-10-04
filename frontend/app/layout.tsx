import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Feed",
  description: "News feed HLD reference implementation",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
