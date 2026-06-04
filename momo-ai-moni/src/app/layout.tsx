import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoMo AI Moni",
  description: "Hackathon project UX corrections",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
