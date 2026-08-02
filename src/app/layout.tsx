import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family AI",
  description: "The family's shared home screen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
