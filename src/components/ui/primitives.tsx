/**
 * Primitivas de apresentação do design system Brasmáquinas (TASK-076).
 * Componentes puros, sem estado e sem lógica de domínio — apenas composição visual.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/* ── Botões ─────────────────────────────────────────────────────────────── */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-all rounded-md " +
  "disabled:opacity-50 disabled:cursor-not-allowed select-none";

const BTN_VARIANT = {
  primary:
    "bg-brand hover:bg-brand-hover active:bg-brand-deep text-white shadow-card hover:shadow-raised",
  secondary:
    "bg-background border border-border-strong hover:border-brand-300 hover:bg-brand-50 text-ink",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger hover:bg-red-700 text-white",
} as const;

const BTN_SIZE = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-[15px] px-6 py-3",
} as const;

export function buttonClass(
  variant: keyof typeof BTN_VARIANT = "primary",
  size: keyof typeof BTN_SIZE = "md",
): string {
  return `${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]}`;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: {
  href: string;
  variant?: keyof typeof BTN_VARIANT;
  size?: keyof typeof BTN_SIZE;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}

/* ── Cartões e superfícies ──────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-background border border-border rounded-lg shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Rótulo de seção (caps técnicos) ────────────────────────────────────── */

export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Métrica (cabeçalho de páginas) ─────────────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  const valueTone = {
    neutral: "text-ink",
    brand: "text-brand",
    success: "text-success-strong",
    warning: "text-warning",
  }[tone];
  return (
    <div className="bg-background border border-border rounded-lg shadow-card px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {label}
      </div>
      <div className={`text-2xl font-semibold tracking-tight mt-1 tabular ${valueTone}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-ink-3 mt-0.5">{hint}</div>}
    </div>
  );
}

/* ── Badge de status ────────────────────────────────────────────────────── */

export function StatusBadge({
  label,
  dotClass,
  className = "",
}: {
  label: string;
  dotClass: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background border border-border text-ink-2 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-card px-8 py-20 text-center">
      {icon && <div className="flex justify-center mb-6">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink mb-1.5">{title}</h3>
      <p className="text-sm text-ink-3 max-w-sm mx-auto mb-8">{description}</p>
      {action}
    </div>
  );
}
