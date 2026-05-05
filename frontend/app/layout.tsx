import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Entries",
  description: "Frontend for the Flask daily-entries backend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
