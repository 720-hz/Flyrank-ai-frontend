import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyRank Frontend Capstone",
  description:
    "Capstone project for the FlyRank Frontend Development with AI track.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
