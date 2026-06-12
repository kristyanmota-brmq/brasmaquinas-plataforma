import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";

/**
 * Shell de navegação principal (TASK-076) — barra petróleo profunda com a
 * identidade da marca, navegação e identificação de versão da metodologia.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-shell border-b border-shell-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-8">
          <Link
            href="/projetos"
            className="hover:opacity-90 transition-opacity"
            aria-label="Brasmáquinas — Projetos"
          >
            <Logo size={26} dark />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link
              href="/projetos"
              className="px-3 py-1.5 rounded-md text-shell-ink hover:bg-shell-2 transition-colors font-medium"
            >
              Projetos
            </Link>
            <Link
              href="/projetos/novo"
              className="px-3 py-1.5 rounded-md text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink transition-colors"
            >
              Novo projeto
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-shell-ink-2 border border-shell-border rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Aspersão · V0.5-RC
          </span>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-8 w-8 ring-2 ring-shell-border",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
