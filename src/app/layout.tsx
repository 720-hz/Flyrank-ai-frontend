import type { Metadata } from "next";
import "./globals.css";
import { RootNav } from "@/components/root-nav";

export const metadata: Metadata = {
  title: "Flyrank Console",
  description:
    "An internal console for AI-assisted engineering work — agents, runs, and account settings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <RootNav />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
