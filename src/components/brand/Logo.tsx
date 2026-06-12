interface LogoProps {
  size?: number;
  withText?: boolean;
  /** Versão para fundos escuros (shell petróleo): texto claro e B em branco. */
  dark?: boolean;
  className?: string;
}

export function Logo({ size = 28, withText = true, dark = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Brasmáquinas"
      >
        {/* Esquerda (verde-petróleo, forma do B) — branca em fundo escuro */}
        <path
          d="M4 4 C14 4, 18 8, 18 18 L18 22 C18 32, 14 36, 4 36 Z"
          fill={dark ? "#FFFFFF" : "#094641"}
        />
        {/* Topo direito (verde) */}
        <path
          d="M22 4 C32 4, 36 8, 36 18 L22 18 Z"
          fill="#05A835"
        />
        {/* Base direita (amarelo) */}
        <path
          d="M22 22 L36 22 C36 32, 32 36, 22 36 Z"
          fill="#EFD03A"
        />
      </svg>
      {withText && (
        <span
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: dark ? "#FFFFFF" : "#094641" }}
        >
          Brasmáquinas
        </span>
      )}
    </div>
  );
}
