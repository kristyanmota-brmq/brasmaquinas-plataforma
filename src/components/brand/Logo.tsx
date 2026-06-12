interface LogoProps {
  size?: number;
  withText?: boolean;
  /** Versão para fundos escuros (shell petróleo): lâmina e wordmark em branco. */
  dark?: boolean;
  className?: string;
}

/**
 * Logo oficial Brasmáquinas — reproduzida do asset real das propostas
 * (`public/brand/brasmaquinas-logo.png`): lâmina petróleo à esquerda +
 * duas folhas (verde e amarela) separadas por corte diagonal; wordmark
 * empilhado BRAS / MÁQUINAS. Cada forma tem cantos opostos arredondados
 * (TL+BR) e os outros dois vivos.
 */
export function Logo({ size = 28, withText = true, dark = false, className = "" }: LogoProps) {
  const petrol = dark ? "#FFFFFF" : "#094641";
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
        {/* Lâmina esquerda (petróleo) — TL e BR arredondados, TR e BL vivos */}
        <path
          d="M16.5 0.5 L16.5 30.5 Q16.5 39.5 7.5 39.5 L0.5 39.5 L0.5 9.5 Q0.5 0.5 9.5 0.5 Z"
          fill={petrol}
        />
        {/* Folha superior (verde) — corte diagonal inferior subindo à direita */}
        <path
          d="M39.5 3.5 L39.5 14.5 Q39.5 20.8 31.2 21.9 L20.5 23.4 L20.5 12.5 Q20.5 3.5 29.5 3.5 Z"
          fill="#05A835"
        />
        {/* Folha inferior (amarela) — corte diagonal superior, espelho da verde */}
        <path
          d="M39.5 22.2 L39.5 30.5 Q39.5 39.5 30.5 39.5 L20.5 39.5 L20.5 28.4 Q20.5 25.8 28.8 24.7 Z"
          fill="#EFD03A"
        />
      </svg>
      {withText && (
        <span
          className="flex flex-col justify-center leading-none select-none"
          style={{ color: petrol }}
        >
          <span
            className="font-bold tracking-[0.02em]"
            style={{ fontSize: size * 0.42 }}
          >
            BRAS
          </span>
          <span
            className="font-semibold tracking-[0.14em]"
            style={{ fontSize: size * 0.26, marginTop: size * 0.04 }}
          >
            MÁQUINAS
          </span>
        </span>
      )}
    </div>
  );
}
