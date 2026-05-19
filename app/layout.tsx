import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLOMON",
  description: "Your personal counsel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-[#09090b] text-white antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
