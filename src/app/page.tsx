import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/primitives";

const CAPACIDADES = [
  {
    titulo: "Motor hidráulico completo",
    descricao:
      "Hazen-Williams com diâmetro interno real, caminho crítico exaustivo, HMT, validação de bomba e classes de pressão por trecho.",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2v6" /><path d="M5 10c0 6 3.5 10 7 10s7-4 7-10" />
        <path d="M5 10h14" />
      </svg>
    ),
  },
  {
    titulo: "Governança de emissão",
    descricao:
      "Nenhuma proposta sai com pendência técnica: gates bloqueiam o PDF até o projeto estar defensável perante o RT.",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "Da área à proposta",
    descricao:
      "Malha de aspersores, setorização agronômica, rede dimensionada, BOM precificada e proposta em PDF — em minutos, auditável.",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 4h16v16H4z" /><path d="M4 9h16" /><path d="M9 9v11" />
      </svg>
    ),
  },
];

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* ── Barra superior ── */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Logo size={30} />
          {!isSignedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className={buttonClass("ghost", "sm")}>
                Entrar
              </Link>
              <Link href="/sign-up" className={buttonClass("primary", "sm")}>
                Criar conta
              </Link>
            </div>
          ) : (
            <Link href="/projetos" className={buttonClass("primary", "sm")}>
              Meus projetos
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand font-semibold mb-8 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Engenharia de irrigação Brasmáquinas
            </div>

            <h1 className="text-[2.75rem] md:text-6xl font-semibold tracking-tight text-ink mb-6 leading-[1.04]">
              Projetos de irrigação
              <br />
              <span className="text-brand">do levantamento à proposta.</span>
            </h1>

            <p className="text-lg text-ink-2 mb-10 max-w-xl leading-relaxed">
              A plataforma técnico-comercial da maior empresa de irrigação do
              Brasil. Layout, hidráulica, lista de materiais e proposta
              auditável — com travas metodológicas assinadas pelo responsável
              técnico.
            </p>

            {!isSignedIn ? (
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-up" className={buttonClass("primary", "lg")}>
                  Começar agora
                </Link>
                <Link href="/sign-in" className={buttonClass("secondary", "lg")}>
                  Já tenho conta
                </Link>
              </div>
            ) : (
              <Link href="/projetos" className={buttonClass("primary", "lg")}>
                Ir para meus projetos →
              </Link>
            )}
          </div>

          {/* Painel visual: malha técnica estilizada */}
          <div className="hidden lg:block">
            <div className="relative bg-shell rounded-xl shadow-overlay overflow-hidden aspect-[4/3]">
              <svg viewBox="0 0 480 360" className="w-full h-full" aria-hidden>
                {/* grade da malha */}
                {Array.from({ length: 11 }, (_, i) => (
                  <line key={`v${i}`} x1={40 + i * 40} y1={30} x2={40 + i * 40} y2={330} stroke="#11544D" strokeWidth="1" />
                ))}
                {Array.from({ length: 8 }, (_, i) => (
                  <line key={`h${i}`} x1={40} y1={30 + i * 43} x2={440} y2={30 + i * 43} stroke="#11544D" strokeWidth="1" />
                ))}
                {/* principal */}
                <line x1={40} y1={330} x2={440} y2={330} stroke="#EFD03A" strokeWidth="3" />
                {/* sub-coletor (manifold) */}
                <line x1={80} y1={245} x2={400} y2={245} stroke="#05A835" strokeWidth="2.5" />
                <line x1={240} y1={245} x2={240} y2={330} stroke="#05A835" strokeWidth="2.5" />
                {/* laterais */}
                {Array.from({ length: 9 }, (_, i) => (
                  <line key={`l${i}`} x1={80 + i * 40} y1={73} x2={80 + i * 40} y2={245} stroke="#3D9183" strokeWidth="1.5" />
                ))}
                {/* aspersores */}
                {Array.from({ length: 9 }, (_, c) =>
                  Array.from({ length: 5 }, (_, r) => (
                    <circle key={`s${c}-${r}`} cx={80 + c * 40} cy={73 + r * 43} r="3" fill="#E8F2F0" />
                  )),
                )}
                {/* raios de cobertura sutis */}
                {Array.from({ length: 9 }, (_, c) => (
                  <circle key={`c${c}`} cx={80 + c * 40} cy={159} r="22" fill="none" stroke="#3D9183" strokeWidth="0.6" opacity="0.5" />
                ))}
              </svg>
              <div className="absolute bottom-4 left-4 text-[10px] font-mono uppercase tracking-[0.14em] text-shell-ink-2">
                Espinha de peixe · manifold · 1 setor ativo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capacidades ── */}
      <section className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          {CAPACIDADES.map((c) => (
            <div
              key={c.titulo}
              className="bg-background border border-border rounded-lg shadow-card p-6"
            >
              <div className="w-10 h-10 rounded-md bg-brand-50 text-brand flex items-center justify-center mb-4">
                {c.icone}
              </div>
              <h3 className="font-semibold text-ink mb-1.5">{c.titulo}</h3>
              <p className="text-sm text-ink-3 leading-relaxed">{c.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rodapé ── */}
      <footer className="bg-shell">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={24} dark />
          <div className="text-[11px] uppercase tracking-[0.15em] text-shell-ink-2 font-mono">
            Brasmáquinas · Metodologia V0.5-RC · Aspersão convencional
          </div>
        </div>
      </footer>
    </main>
  );
}
