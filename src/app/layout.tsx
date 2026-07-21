import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Logo.",
  description:
    "Plataforma de leitura documental: classifique, extraia e valide dados de documentos com precisão.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${display.variable} ${body.variable} min-h-screen antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
