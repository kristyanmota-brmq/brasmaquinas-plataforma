import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Logo } from "@/components/brand/Logo";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="px-8 py-6">
        <Logo size={32} />
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center -mt-24">
          <div className="inline-block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-10 font-mono">
            Aspersão Convencional · V0.5-RC
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-ink mb-6 leading-[1.05]">
            Projetos de irrigação,
            <br />
            <span className="text-ink-2">do levantamento à proposta.</span>
          </h1>

          <p className="text-lg text-ink-2 mb-12 max-w-xl mx-auto leading-relaxed">
            Plataforma técnica e comercial da Brasmáquinas. Travas
            metodológicas aplicadas, propostas auditáveis, decisões em minutos.
          </p>

          {!isSignedIn ? (
            <div className="flex gap-3 justify-center">
              <Link
                href="/sign-up"
                className="px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-md font-medium transition-colors"
              >
                Criar conta
              </Link>
              <Link
                href="/sign-in"
                className="px-6 py-3 border border-border hover:border-border-strong text-ink rounded-md font-medium transition-colors"
              >
                Entrar
              </Link>
            </div>
          ) : (
            <Link
              href="/projetos"
              className="inline-flex px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-md font-medium transition-colors"
            >
              Ir para meus projetos →
            </Link>
          )}
        </div>
      </div>

      <footer className="px-8 py-6 text-center text-[11px] uppercase tracking-[0.15em] text-ink-4 font-mono">
        Brasmáquinas · Metodologia V0.5-RC
      </footer>
    </main>
  );
}
