import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasmáquinas — Plataforma de Projetos",
  description:
    "Plataforma de projeto automatizado de irrigação por aspersão convencional.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#094641",
    colorText: "#0A0A0A",
    colorTextSecondary: "#525252",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0A0A0A",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: "shadow-none border border-[#E5E5E5]",
    headerTitle: "text-[#0A0A0A] font-semibold",
    headerSubtitle: "text-[#525252]",
    socialButtonsBlockButton:
      "border border-[#E5E5E5] hover:bg-[#FAFAFA] text-[#0A0A0A]",
    formButtonPrimary:
      "bg-[#094641] hover:bg-[#073530] text-white shadow-none normal-case font-semibold",
    footerActionLink: "text-[#094641] hover:text-[#073530]",
    formFieldInput:
      "border border-[#E5E5E5] focus:border-[#094641] focus:ring-[#094641]",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider localization={ptBR} appearance={clerkAppearance}>
      <html
        lang="pt-BR"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
      >
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
