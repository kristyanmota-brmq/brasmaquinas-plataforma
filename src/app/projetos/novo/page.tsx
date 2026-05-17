import Link from "next/link";
import { Header } from "@/components/brand/Header";
import { createProject } from "../actions";

export default function NovoProjetoPage() {
  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/projetos"
          className="text-sm text-ink-3 hover:text-ink-2 inline-block mb-6 transition-colors"
        >
          ← Projetos
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-ink mb-2">
          Novo projeto
        </h1>
        <p className="text-sm text-ink-3 mb-10">
          Preencha os dados básicos. Detalhamento técnico vem nas próximas etapas.
        </p>

        <form
          action={createProject}
          className="bg-background border border-border rounded-md p-8 space-y-6"
        >
          <div>
            <label className="block text-[11px] font-semibold text-ink-2 uppercase tracking-[0.12em] mb-2">
              Nome do projeto <span className="text-danger">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Fazenda Santa Rita — 50ha"
              className="w-full px-3 py-2.5 border border-border rounded-md text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-2 uppercase tracking-[0.12em] mb-2">
              Cliente
            </label>
            <input
              name="client"
              type="text"
              placeholder="Nome ou razão social"
              className="w-full px-3 py-2.5 border border-border rounded-md text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-ink-2 uppercase tracking-[0.12em] mb-2">
                Município
              </label>
              <input
                name="city"
                type="text"
                placeholder="Ex: Barreiras"
                className="w-full px-3 py-2.5 border border-border rounded-md text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-2 uppercase tracking-[0.12em] mb-2">
                UF
              </label>
              <input
                name="state"
                type="text"
                maxLength={2}
                placeholder="BA"
                className="w-full px-3 py-2.5 border border-border rounded-md text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Link
              href="/projetos"
              className="px-4 py-2 text-ink-2 hover:bg-surface rounded-md font-medium text-sm transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-md font-medium text-sm transition-colors"
            >
              Criar projeto
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
