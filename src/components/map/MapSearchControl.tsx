"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, MapPin, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { parseCoordinate } from "@/lib/layout/geo-utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapSearchControlProps {
  /** Chamado quando uma localização é encontrada — voa para o ponto e exibe marcador temporário. */
  onLocationFound: (lng: number, lat: number) => void;
  /** Chamado quando o usuário confirma "Usar como captação" — replica o fluxo existente de captação. */
  onUseAsWaterSource: (lng: number, lat: number) => void;
  /** Fecha o painel e limpa o marcador temporário. */
  onClose: () => void;
}

export function MapSearchControl({
  onLocationFound,
  onUseAsWaterSource,
  onClose,
}: MapSearchControlProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFound, setLastFound] = useState<{ lng: number; lat: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setLastFound(null);

    // Tenta parsing de coordenadas primeiro — sem chamar API externa
    const parsed = parseCoordinate(q);
    if (parsed.ok) {
      setLastFound({ lng: parsed.lng, lat: parsed.lat });
      onLocationFound(parsed.lng, parsed.lat);
      setLoading(false);
      return;
    }

    // Forward geocoding via Mapbox (mesmo provedor já em uso no projeto)
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?country=br&language=pt&types=place,locality,neighborhood,poi,address,region` +
        `&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { features?: { center: [number, number] }[] };
      const feature = data.features?.[0];
      if (!feature) {
        setError("Endereço não encontrado. Tente um endereço mais específico ou insira coordenadas.");
        setLoading(false);
        return;
      }
      const [lng, lat] = feature.center;
      setLastFound({ lng, lat });
      onLocationFound(lng, lat);
    } catch {
      setError(
        "Não foi possível buscar o endereço. Verifique a localização manualmente ou insira coordenadas.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") onClose();
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setError(null);
    if (!e.target.value.trim()) setLastFound(null);
  }

  return (
    <div className="absolute top-16 left-4 z-10 bg-white border border-border rounded-md shadow-lg w-72 flex flex-col gap-2 p-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Localizar no mapa
        </span>
        <button
          onClick={onClose}
          className="text-ink-4 hover:text-ink-2 transition-colors"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Aviso operacional */}
      <p className="text-[10px] text-ink-3 flex items-start gap-1 leading-relaxed">
        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
        Localização aproximada. Validar visualmente a área e a captação antes de avançar.
      </p>

      {/* Campo de busca */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Endereço ou -14.22, -42.78"
          className="flex-1 text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-brand bg-background text-ink"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          title="Buscar"
          className={clsx(
            "px-2 py-1.5 rounded text-xs transition-colors",
            loading || !query.trim()
              ? "bg-surface text-ink-4 cursor-not-allowed"
              : "bg-brand text-white hover:bg-brand-hover",
          )}
        >
          {loading ? (
            <span className="text-[10px]">…</span>
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <p className="text-[10px] text-red-600 leading-relaxed">{error}</p>
      )}

      {/* Ação: usar como captação */}
      {lastFound && !error && (
        <button
          onClick={() => {
            onUseAsWaterSource(lastFound.lng, lastFound.lat);
          }}
          className="text-xs text-brand hover:underline text-left font-medium"
        >
          Usar como captação
        </button>
      )}
    </div>
  );
}
