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
    colorText: "#10201C",
    colorTextSecondary: "#3D4A46",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#10201C",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: "shadow-[0_2px_4px_rgba(6,46,42,0.06),0_6px_16px_rgba(6,46,42,0.08)] border border-[#E3E8E6] rounded-xl",
    headerTitle: "text-[#10201C] font-semibold",
    headerSubtitle: "text-[#3D4A46]",
    socialButtonsBlockButton:
      "border border-[#E3E8E6] hover:bg-[#EBF5F3] text-[#10201C]",
    formButtonPrimary:
      "bg-[#094641] hover:bg-[#0E594C] text-white shadow-none normal-case font-semibold",
    footerActionLink: "text-[#094641] hover:text-[#0E594C]",
    formFieldInput:
      "border border-[#E3E8E6] focus:border-[#094641] focus:ring-[#094641]",
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
