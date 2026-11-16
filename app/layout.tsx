import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savit CRM",
  description: "AI-powered CRM for Savit Interactive",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
