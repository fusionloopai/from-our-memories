import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "From Our Memories — Jenks Family",
  description: "A 2026 Jenks Family Vacation Slideshow at Palmer Lake",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#0a1628] overflow-hidden">{children}</body>
    </html>
  );
}
