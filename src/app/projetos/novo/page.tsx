import Link from "next/link";
import { Header } from "@/components/brand/Header";
import { buttonClass, Card, SectionLabel } from "@/components/ui/primitives";
import { createProject } from "../actions";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-background border border-border rounded-md text-ink " +
  "placeholder:text-ink-4 focus:outline-none focus:border-brand focus:ring-2 " +
  "focus:ring-brand-100 transition-colors";

export default function NovoProjetoPage() {
  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link
          href="/projetos"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-brand mb-6 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Projetos
        </Link>

        <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink mb-1">
          Novo projeto
        </h1>
        <p className="text-sm text-ink-3 mb-8">
          Identificação básica do projeto. A área, a malha e o dimensionamento
          vêm na sequência, direto no mapa.
        </p>

        <Card className="overflow-hidden">
          <form action={createProject}>
            <div className="p-7 space-y-6">
              <SectionLabel>Identificação</SectionLabel>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Nome do projeto <span className="text-danger">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Fazenda Santa Rita — 50 ha"
                  className={INPUT_CLASS}
                />
                <p className="text-xs text-ink-4 mt-1.5">
                  Como o projeto aparecerá na proposta e nos relatórios.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Cliente
                </label>
                <input
                  name="client"
                  type="text"
                  placeholder="Nome ou razão social"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Município
                  </label>
                  <input
                    name="city"
                    type="text"
                    placeholder="Ex: Barreiras"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    UF
                  </label>
                  <input
                    name="state"
                    type="text"
                    maxLength={2}
                    placeholder="BA"
                    className={`${INPUT_CLASS} uppercase`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-7 py-4 bg-surface border-t border-border">
              <Link href="/projetos" className={buttonClass("ghost", "md")}>
                Cancelar
              </Link>
              <button type="submit" className={buttonClass("primary", "md")}>
                Criar projeto
              </button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
