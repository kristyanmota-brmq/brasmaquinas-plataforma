"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  MapRef,
  MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import {
  findOptimalGridAngle,
  generateRotatedSprinklerGrid,
} from "@/lib/layout/sprinkler-grid";
import {
  findBestSprinklerLayout,
  runTopKHydraulicValidation,
  OPTIMIZER_PARAMS,
  type LayoutSelectionResult,
} from "@/lib/layout/sprinkler-grid-optimizer";
import { candidateToSprinklers } from "@/lib/layout/optimizer-integration";
import {
  MousePointer2,
  Hexagon,
  Droplets,
  Wrench,
  Check,
  X,
  Loader2,
  Mountain,
  Ruler,
  Sparkles,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Spline,
  BookOpen,
  FileDown,
  Search,
  MapPin,
  Zap,
} from "lucide-react";
import { MapSearchControl } from "@/components/map/MapSearchControl";
import clsx from "clsx";
import {
  saveProjectLayout,
  type ProjectLayout,
} from "@/app/projetos/[id]/actions";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import type { BOMResult } from "@/lib/bom";
import type { Lateral, PhysicalColumn } from "@/lib/layout/laterais";
import { resolveSectorLabelAnchor } from "@/lib/layout/sector-label-anchor";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import {
  buildSelectedPipelineCoords,
  buildMainPipelineUpdate,
  buildSectorizationForJornada,
} from "@/lib/layout/layout-use-cases";
import type { ArchitectureSelectionResult } from "@/lib/layout/architecture-selector";
import { MemorialPanel } from "@/components/map/MemorialPanel";
import { partitionBlockers } from "@/components/map/blocker-classification";

interface Props {
  projectId: string;
  initialLayout?: ProjectLayout;
  projectName?: string;
  statusLabel?: string;
  client?: string;
  city?: string;
  state?: string;
}

type Mode = "view" | "polygon" | "water" | "pump" | "pipeline";

type OptimizerState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ready"; result: LayoutSelectionResult }
  | { status: "hydraulic_running"; result: LayoutSelectionResult }
  | { status: "error"; message: string };

// ── TASK-008A: diagnóstico de segmentos inválidos ─────────────────────────────

interface InvalidSegmentSummary {
  id: string;
  type: string;
  flowM3h: number;
  diameterNominalMm: number;
  internalDiameterMm?: number;
  velocityMs: number;
  maxVelocityMs: number;
  headLossMca: number;
  maxHeadLossMca?: number;
  rejectionReason: string;
}

const REJECTION_REASON_LABEL: Record<string, string> = {
  velocity: "Velocidade acima do limite",
  lateral_headloss: "Perda de carga lateral excessiva",
  secondary_headloss: "Perda de carga de ramal excessiva",
  pressure_class: "Violação de classe de pressão (PN)",
  multiple: "Múltiplas causas",
  unknown: "Motivo desconhecido",
};
type Jornada = 9 | 14 | 21;

const DEFAULT_CENTER = { longitude: -45.0, latitude: -12.0, zoom: 14 };
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const LAMINA_MM = 10;

// Paleta sóbria refinada — alternância verde/azul/bronze para máxima distinção entre vizinhos
const SECTOR_PALETTE = [
  "#094641",
  "#3C6E8F",
  "#7B9A6F",
  "#A07F4F",
  "#4A6F7E",
  "#6A8068",
  "#8E7556",
  "#3D5258",
];

async function reverseGeocode(lng: number, lat: number) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=pt&access_token=${MAPBOX_TOKEN}`
    );
    const data = await res.json();
    const place = data.features?.[0];
    if (!place) return null;
    const ctx = place.context ?? [];
    const city =
      ctx.find((c: { id: string }) => c.id.startsWith("place"))?.text ??
      place.text;
    const region = ctx.find((c: { id: string }) => c.id.startsWith("region"));
    const state = region?.short_code?.replace("BR-", "") ?? region?.text ?? "";
    return { city, state, fullAddress: place.place_name };
  } catch {
    return null;
  }
}

function calculatePipelineLength(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += turf.distance(turf.point(coords[i]), turf.point(coords[i + 1]), {
      units: "kilometers",
    });
  }
  return total * 1000;
}


export function ProjectMap({ projectId, initialLayout, projectName, statusLabel, client, city, state }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layout, setLayout] = useState<ProjectLayout>(initialLayout ?? {});
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [drawingPipeline, setDrawingPipeline] = useState<[number, number][]>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showMemorial, setShowMemorial] = useState(false);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<
    | { kind: "blocked"; blockers: string[]; invalidHydraulicSegments: InvalidSegmentSummary[] }
    | { kind: "technical" }
    | null
  >(null);
  // TASK-061: resultado da seleção arquitetural A0/A2/A3 do último traçado auto
  // (transparência — null quando o traçado é manual ou ainda não gerado).
  const [archSelection, setArchSelection] = useState<ArchitectureSelectionResult | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMarker, setSearchMarker] = useState<{ lng: number; lat: number } | null>(null);
  const [optimizerState, setOptimizerState] = useState<OptimizerState>({ status: "idle" });
  const hasMounted = useRef(false);

  const isDrawingPolygon = mode === "polygon";
  const isDrawingPipeline = mode === "pipeline";
  const hasPolygonInProgress = isDrawingPolygon && drawingCoords.length > 0;

  // Limpa o marcador de busca e o painel ao entrar em qualquer modo de desenho.
  useEffect(() => {
    if (mode !== "view") {
      setSearchMarker(null);
      setShowSearch(false);
    }
  }, [mode]);
  const hasPipelineInProgress = isDrawingPipeline && drawingPipeline.length > 1;

  // Limpa o painel do motor de candidatos quando a área muda — candidato anterior não é mais válido.
  useEffect(() => {
    setOptimizerState({ status: "idle" });
  }, [layout.area]);

  const optimalAngle = useMemo(
    () => (layout.area ? findOptimalGridAngle(layout.area) : 0),
    [layout.area]
  );

  // ── Resultado completo do projeto — única fonte de verdade para display ────
  const projectResult = useMemo(
    () => calculateIrrigationProject(layout),
    [layout],
  );

  // Colunas físicas com deps restritas (sprinklers+centroid) para estabilidade
  // em operações de edição: applyJornada e auto-pipeline não devem re-executar
  // quando sectorization ou mainPipeline mudam.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const physicalColumns = useMemo<PhysicalColumn[]>(
    () => projectResult.physical?.physicalColumns ?? [],
    [layout.sprinklers, layout.centroid],
  );

  const laterais: Lateral[] = projectResult.distribution?.laterais ?? [];
  const bom: BOMResult | null = projectResult.bom;
  const controlPoints = projectResult.constructability?.controlPoints ?? [];
  const secondaries = projectResult.hydraulic?.secondaries ?? [];
  const connectivityReport = projectResult.hydraulic?.connectivityReport ?? null;

  const intensidadeMmPorHora = useMemo(
    () =>
      (1000 * ASPERSOR_PADRAO.vazaoM3PorHora) /
      (ASPERSOR_PADRAO.espacamentoPadraoM * ASPERSOR_PADRAO.espacamentoPadraoM),
    []
  );

  const tempoPorSetorMinutos = useMemo(
    () => Math.round((LAMINA_MM / intensidadeMmPorHora) * 60),
    [intensidadeMmPorHora]
  );

  // Coluna física = tubo real reto: LineString de 2 pontos (startLngLat → endLngLat).
  // Aspersores intermediários são conexões ao tubo, não vértices da polilinha.
  const physicalColumnsGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: physicalColumns
      .filter((col) => col.sprinklerIndices.length >= 2)
      .map((col) => ({
        type: "Feature" as const,
        properties: { id: col.id, isSplit: col.sectorsTouched.length > 1 },
        geometry: {
          type: "LineString" as const,
          // TASK-028: consome a polilinha real da lateral; fallback para
          // reta start→end se routeCoords estiver ausente.
          coordinates: col.routeCoords && col.routeCoords.length >= 2
            ? col.routeCoords
            : [col.startLngLat, col.endLngLat],
        },
      })),
  }), [physicalColumns]);

  const secondariesGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: secondaries.map((s) => ({
      type: "Feature" as const,
      properties: { physicalColumnId: s.physicalColumnId, lengthM: s.lengthM },
      geometry: { type: "LineString" as const, coordinates: s.coords ?? [s.fromCoord, s.toCoord] },
    })),
  }), [secondaries]);

  const coverageGeoJSON = useMemo(() => {
    if (!layout.sprinklers || !showCoverage) return null;
    const features = layout.sprinklers.positions
      .map(([lng, lat]) =>
        turf.buffer(turf.point([lng, lat]), ASPERSOR_PADRAO.raioMolhadoM, {
          units: "meters",
        })
      )
      .filter((f): f is GeoJSON.Feature<GeoJSON.Polygon> => f !== undefined);
    return turf.featureCollection(features);
  }, [layout.sprinklers, showCoverage]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const t = setTimeout(async () => {
      setSaving(true);
      await saveProjectLayout(projectId, layout);
      setSaving(false);
      setSavedAt(new Date());
    }, 1200);
    return () => clearTimeout(t);
  }, [layout, projectId]);

  // Auto-sugestao de tubulacao principal (bottom-up): percorre pontos de derivação das laterais.
  // Nao sobrescreve se vendedor desenhou manualmente.
  useEffect(() => {
    if (!layout.waterSource || !layout.area) return;
    if (layout.mainPipeline?.source === "manual") return;
    if (!layout.centroid) return;

    const { principal, adutora, lengthMeters, architectureSelection } = buildSelectedPipelineCoords(
      layout.waterSource,
      physicalColumns,
      layout.centroid,
      layout.sprinklers?.gridAngleDegrees ?? 0,
      laterais,
      // TASK-061: completa o wiring da TASK-056 — candidatos avaliados com a
      // topologia v12 real (espinha de peixe) quando há setorização.
      projectResult.operational?.operationalSegments,
    );
    setArchSelection(architectureSelection);

    // Adutora conecta sempre ao endpoint mais próximo da captação (nearest, via principal.ts).
    // O desnível é registrado em elevationDeltaM para dimensionamento da bomba — não muda o traçado.
    const elevationStartM = queryElevation(principal[0][0], principal[0][1]);
    const elevationEndM = queryElevation(
      principal[principal.length - 1][0],
      principal[principal.length - 1][1],
    );

    setLayout((l) => ({
      ...l,
      mainPipeline: buildMainPipelineUpdate(principal, adutora, lengthMeters, elevationStartM, elevationEndM),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layout.waterSource?.lng,
    layout.waterSource?.lat,
    layout.area,
    layout.sprinklers,
    layout.centroid,
  ]);

  useEffect(() => {
    setSelectedSector(null);
  }, [layout.sectorization?.setoresCount]);

  const queryElevation = useCallback(
    (lng: number, lat: number): number | undefined => {
      const map = mapRef.current?.getMap();
      if (!map) return undefined;
      try {
        const el = map.queryTerrainElevation([lng, lat]);
        return typeof el === "number" ? el : undefined;
      } catch {
        return undefined;
      }
    },
    []
  );

  const enterPipelineMode = useCallback(() => {
    if (!layout.waterSource) return;
    setDrawingPipeline([[layout.waterSource.lng, layout.waterSource.lat]]);
    setMode("pipeline");
  }, [layout.waterSource]);

  const handleLocationFound = useCallback((lng: number, lat: number) => {
    setSearchMarker({ lng, lat });
    mapRef.current?.getMap()?.flyTo({ center: [lng, lat], zoom: 15 });
  }, []);

  const handleUseAsWaterSource = useCallback(async (lng: number, lat: number) => {
    const elevation = queryElevation(lng, lat);
    const geocoded = await reverseGeocode(lng, lat);
    setLayout((l) => {
      const next: ProjectLayout = {
        ...l,
        waterSource: { lng, lat, elevation },
        pumpLocation: l.pumpSeparate ? l.pumpLocation : null,
        geocoded: geocoded ?? l.geocoded,
      };
      if (l.centroid) {
        const distKm = turf.distance(
          turf.point([lng, lat]),
          turf.point([l.centroid.lng, l.centroid.lat]),
          { units: "kilometers" }
        );
        const geodetic: ProjectLayout["geodetic"] = {
          distanceSourceToAreaMeters: distKm * 1000,
        };
        if (elevation !== undefined && l.areaElevation !== undefined) {
          geodetic.elevationDeltaMeters = l.areaElevation - elevation;
        }
        next.geodetic = geodetic;
      }
      return next;
    });
    setMode("view");
    setShowSearch(false);
    setSearchMarker(null);
  }, [queryElevation, setLayout]);

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;

      // Em modo view: clique pode selecionar setor (se feature de aspersor clicada) ou desselecionar
      if (mode === "view") {
        const feature = e.features?.[0];
        if (feature?.properties?.sector !== undefined) {
          const s = feature.properties.sector as number;
          setSelectedSector((prev) => (prev === s ? null : s));
        } else {
          setSelectedSector(null);
        }
        return;
      }

      if (mode === "polygon") {
        setDrawingCoords((prev) => [...prev, [lng, lat]]);
        return;
      }

      if (mode === "pipeline") {
        setDrawingPipeline((prev) => [...prev, [lng, lat]]);
        return;
      }

      if (mode === "water") {
        const elevation = queryElevation(lng, lat);
        const geocoded = await reverseGeocode(lng, lat);
        setLayout((l) => {
          const next: ProjectLayout = {
            ...l,
            waterSource: { lng, lat, elevation },
            pumpLocation: l.pumpSeparate ? l.pumpLocation : null,
            geocoded: geocoded ?? l.geocoded,
          };
          if (l.centroid) {
            const distKm = turf.distance(
              turf.point([lng, lat]),
              turf.point([l.centroid.lng, l.centroid.lat]),
              { units: "kilometers" }
            );
            const geodetic: ProjectLayout["geodetic"] = {
              distanceSourceToAreaMeters: distKm * 1000,
            };
            if (elevation !== undefined && l.areaElevation !== undefined) {
              geodetic.elevationDeltaMeters = l.areaElevation - elevation;
            }
            next.geodetic = geodetic;
          }
          return next;
        });
        setMode("view");
        return;
      }

      if (mode === "pump") {
        const elevation = queryElevation(lng, lat);
        setLayout((l) => ({
          ...l,
          pumpLocation: { lng, lat, elevation },
          pumpSeparate: true,
        }));
        setMode("view");
      }
    },
    [mode, queryElevation]
  );

  const finishPolygon = useCallback(() => {
    if (drawingCoords.length < 3) return;
    const closed: [number, number][] = [...drawingCoords, drawingCoords[0]];
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [closed],
    };
    const polyFeature = turf.polygon(polygon.coordinates);
    const areaM2 = turf.area(polyFeature);
    const areaHectares = areaM2 / 10000;
    const perimeterKm = turf.length(turf.polygonToLine(polyFeature), {
      units: "kilometers",
    });
    const perimeterMeters = perimeterKm * 1000;
    const centroidF = turf.centroid(polyFeature);
    const centroid = {
      lng: centroidF.geometry.coordinates[0],
      lat: centroidF.geometry.coordinates[1],
    };
    const areaElevation = queryElevation(centroid.lng, centroid.lat);

    setLayout((l) => {
      const water = l.waterSource;
      const geodetic: ProjectLayout["geodetic"] = {};
      if (water) {
        const distKm = turf.distance(
          turf.point([water.lng, water.lat]),
          turf.point([centroid.lng, centroid.lat]),
          { units: "kilometers" }
        );
        geodetic.distanceSourceToAreaMeters = distKm * 1000;
        if (water.elevation !== undefined && areaElevation !== undefined) {
          geodetic.elevationDeltaMeters = areaElevation - water.elevation;
        }
      }
      return {
        ...l,
        area: polygon,
        areaHectares,
        perimeterMeters,
        centroid,
        areaElevation,
        geodetic,
        sprinklers: undefined,
        sectorization: undefined,
      };
    });
    setDrawingCoords([]);
    setMode("view");
  }, [drawingCoords, queryElevation]);

  const cancelPolygon = useCallback(() => {
    setDrawingCoords([]);
    setMode("view");
  }, []);

  const finishPipeline = useCallback(() => {
    if (drawingPipeline.length < 2) return;
    const lengthMeters = calculatePipelineLength(drawingPipeline);
    const [startLng, startLat] = drawingPipeline[0];
    const [endLng, endLat] = drawingPipeline[drawingPipeline.length - 1];
    const elevationStartM = queryElevation(startLng, startLat);
    const elevationEndM = queryElevation(endLng, endLat);
    const elevationDeltaM =
      elevationStartM !== undefined && elevationEndM !== undefined
        ? elevationEndM - elevationStartM
        : undefined;

    setLayout((l) => ({
      ...l,
      mainPipeline: {
        coordinates: drawingPipeline,
        lengthMeters,
        segments: drawingPipeline.length - 1,
        elevationStartM,
        elevationEndM,
        elevationDeltaM,
        source: "manual",
      },
    }));
    setArchSelection(null); // TASK-061: traçado manual — seleção do motor não se aplica
    setDrawingPipeline([]);
    setMode("view");
  }, [drawingPipeline, queryElevation]);

  const cancelPipeline = useCallback(() => {
    setDrawingPipeline([]);
    setMode("view");
  }, []);

  const undoPipelineVertex = useCallback(() => {
    setDrawingPipeline((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetToAutoPipeline = useCallback(() => {
    if (!layout.waterSource || !layout.centroid) return;

    const { principal, adutora, lengthMeters, architectureSelection } = buildSelectedPipelineCoords(
      layout.waterSource,
      physicalColumns,
      layout.centroid,
      layout.sprinklers?.gridAngleDegrees ?? 0,
      laterais,
      projectResult.operational?.operationalSegments,
    );
    setArchSelection(architectureSelection);

    const elevationStartM = queryElevation(principal[0][0], principal[0][1]);
    const elevationEndM = queryElevation(
      principal[principal.length - 1][0],
      principal[principal.length - 1][1],
    );

    setLayout((l) => ({
      ...l,
      mainPipeline: buildMainPipelineUpdate(principal, adutora, lengthMeters, elevationStartM, elevationEndM),
    }));
  }, [layout.waterSource, layout.centroid, layout.sprinklers, physicalColumns, laterais, queryElevation, projectResult.operational]);

  const clearPipeline = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.mainPipeline;
      return next;
    });
  }, []);

  const validateCorridor = useCallback(() => {
    setLayout((l) => {
      if (!l.mainPipeline) return l;
      return {
        ...l,
        mainPipeline: { ...l.mainPipeline, corridorValidated: true },
      };
    });
  }, []);

  const invalidateCorridor = useCallback(() => {
    setLayout((l) => {
      if (!l.mainPipeline) return l;
      return {
        ...l,
        mainPipeline: { ...l.mainPipeline, corridorValidated: false },
      };
    });
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!bom || pdfLoading) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const map = mapRef.current?.getMap();
      let mapImage: string | null = null;

      if (map) {
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        const extend = (lng: number, lat: number) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        };

        // Usa apenas o polígono da área para o zoom — incluir captação (128m+ da área)
        // puxaria o zoom pra fora demais e esconderia os detalhes do layout.
        layout.area?.coordinates[0]?.forEach(([lng, lat]) => extend(lng as number, lat as number));
        layout.sprinklers?.positions.forEach(([lng, lat]) => extend(lng, lat));

        if (minLng !== Infinity) {
          const prevCenter = map.getCenter();
          const prevZoom = map.getZoom();
          await new Promise<void>((resolve) => {
            map.once("idle", () => resolve());
            map.fitBounds(
              [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]],
              { padding: 80, animate: false },
            );
          });
          mapImage = map.getCanvas().toDataURL("image/jpeg", 0.88);
          map.jumpTo({ center: prevCenter, zoom: prevZoom });
        } else {
          mapImage = map.getCanvas().toDataURL("image/jpeg", 0.88);
        }
      }

      const res = await fetch(`/api/projetos/${projectId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapImage }),
      });
      if (!res.ok) {
        let parsed: unknown;
        try { parsed = await res.json(); } catch { parsed = null; }
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          (parsed as Record<string, unknown>).error === "PDF_BLOCKED"
        ) {
          const body = parsed as { blockers: string[]; invalidHydraulicSegments?: InvalidSegmentSummary[] };
          setPdfError({
            kind: "blocked",
            blockers: body.blockers ?? [],
            invalidHydraulicSegments: body.invalidHydraulicSegments ?? [],
          });
        } else {
          setPdfError({ kind: "technical" });
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta-${projectName ?? projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[PDF]", err);
      setPdfError({ kind: "technical" });
    } finally {
      setPdfLoading(false);
    }
  }, [bom, pdfLoading, projectId, projectName, layout]);

  const clearArea = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.area;
      delete next.areaHectares;
      delete next.perimeterMeters;
      delete next.centroid;
      delete next.areaElevation;
      delete next.geodetic;
      delete next.sprinklers;
      delete next.sectorization;
      return next;
    });
  }, []);

  const removeWater = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.waterSource;
      delete next.geodetic;
      delete next.mainPipeline;
      if (!l.pumpSeparate) next.pumpLocation = null;
      return next;
    });
  }, []);

  const togglePumpSeparate = useCallback(() => {
    setLayout((l) => {
      if (l.pumpSeparate) {
        return { ...l, pumpSeparate: false, pumpLocation: null };
      }
      return { ...l, pumpSeparate: true };
    });
  }, []);

  const removePumpSeparate = useCallback(() => {
    setLayout((l) => ({ ...l, pumpLocation: null, pumpSeparate: false }));
  }, []);

  const positionSprinklers = useCallback(() => {
    if (!layout.area || !layout.centroid) return;
    const positions = generateRotatedSprinklerGrid(
      layout.area,
      ASPERSOR_PADRAO.espacamentoPadraoM,
      optimalAngle
    );
    const vazaoProjeto = positions.length * ASPERSOR_PADRAO.vazaoM3PorHora;
    setLayout((l) => ({
      ...l,
      sprinklers: {
        aspersorId: ASPERSOR_PADRAO.sku,
        positions,
        count: positions.length,
        vazaoProjetoM3PorHora: vazaoProjeto,
        espacamentoM: ASPERSOR_PADRAO.espacamentoPadraoM,
        gridAngleDegrees: optimalAngle,
        angleMode: "auto",
      },
      sectorization: undefined,
    }));
  }, [layout.area, layout.centroid, optimalAngle]);

  const updateGridAngle = useCallback(
    (newAngle: number, mode: "auto" | "manual") => {
      if (!layout.area) return;
      const positions = generateRotatedSprinklerGrid(
        layout.area,
        ASPERSOR_PADRAO.espacamentoPadraoM,
        newAngle
      );
      const vazaoProjeto = positions.length * ASPERSOR_PADRAO.vazaoM3PorHora;
      setLayout((l) => ({
        ...l,
        sprinklers: {
          aspersorId: ASPERSOR_PADRAO.sku,
          positions,
          count: positions.length,
          vazaoProjetoM3PorHora: vazaoProjeto,
          espacamentoM: ASPERSOR_PADRAO.espacamentoPadraoM,
          gridAngleDegrees: newAngle,
          angleMode: mode,
        },
        sectorization: undefined,
      }));
    },
    [layout.area]
  );

  const resetToAutoAngle = useCallback(() => {
    updateGridAngle(optimalAngle, "auto");
  }, [optimalAngle, updateGridAngle]);

  const clearSprinklers = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.sprinklers;
      delete next.sectorization;
      return next;
    });
    setShowCoverage(false);
    setSelectedSector(null);
    setOptimizerState({ status: "idle" });
  }, []);

  // ── Motor de candidatos geométricos (TASK-010C) ───────────────────────────
  // Roda findBestSprinklerLayout() somente por clique explícito.
  // Não altera layout.sprinklers — apenas armazena o resultado para exibição.
  const runOptimizer = useCallback(() => {
    if (!layout.area) return;
    setOptimizerState({ status: "running" });

    // setTimeout mantém o render cycle antes do cálculo síncrono pesado.
    setTimeout(() => {
      try {
        const nSetores =
          typeof layout.sectorization?.setoresCount === "number"
            ? layout.sectorization.setoresCount
            : null;
        const ws =
          layout.waterSource
            ? { lng: layout.waterSource.lng, lat: layout.waterSource.lat }
            : null;
        const result = findBestSprinklerLayout(
          layout.area!,
          ASPERSOR_PADRAO.espacamentoPadraoM,
          nSetores,
          ws,
        );
        setOptimizerState({ status: "ready", result });
      } catch (err) {
        setOptimizerState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido ao gerar candidato.",
        });
      }
    }, 0);
  }, [layout.area]);

  // Aplica o melhor candidato a layout.sprinklers após confirmação explícita do usuário.
  const applyOptimizerCandidate = useCallback(() => {
    if (optimizerState.status !== "ready") return;
    const sprinklers = candidateToSprinklers(
      optimizerState.result.best,
      ASPERSOR_PADRAO.sku,
      ASPERSOR_PADRAO.espacamentoPadraoM,
      ASPERSOR_PADRAO.vazaoM3PorHora,
    );
    setLayout((l) => ({ ...l, sprinklers, sectorization: undefined }));
    setOptimizerState({ status: "idle" });
  }, [optimizerState]);

  const dismissOptimizer = useCallback(() => {
    setOptimizerState({ status: "idle" });
  }, []);

  // Valida hidráulica dos Top K candidatos via solver oficial (ação explícita do usuário).
  // Só disponível quando status === "ready" e há waterSource + pump.
  const runHydraulicValidation = useCallback(() => {
    if (optimizerState.status !== "ready") return;
    const currentResult = optimizerState.result;
    setOptimizerState({ status: "hydraulic_running", result: currentResult });

    setTimeout(() => {
      try {
        const nSetores =
          typeof layout.sectorization?.setoresCount === "number"
            ? layout.sectorization.setoresCount
            : null;
        const ws =
          layout.waterSource
            ? { lng: layout.waterSource.lng, lat: layout.waterSource.lat }
            : null;
        const pump = layout.pump ?? null;
        const validated = runTopKHydraulicValidation(currentResult, {
          polygon: layout.area!,
          spacingMeters: ASPERSOR_PADRAO.espacamentoPadraoM,
          waterSource: ws,
          pump,
          geodetic: layout.geodetic,
          nSetores,
        });
        setOptimizerState({ status: "ready", result: validated });
      } catch (err) {
        setOptimizerState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido na validação hidráulica.",
        });
      }
    }, 0);
  }, [optimizerState, layout]);
  // ─────────────────────────────────────────────────────────────────────────

  const applyJornada = useCallback(
    (jornada: Jornada) => {
      if (!layout.sprinklers || !layout.centroid) return;
      const sectorization = buildSectorizationForJornada(
        physicalColumns,
        jornada,
        layout.sprinklers.positions.length,
        ASPERSOR_PADRAO.vazaoM3PorHora,
        tempoPorSetorMinutos,
        // TASK-060: preserva lâmina/cultura informadas ao trocar de jornada
        layout.sectorization?.laminaMm ?? 10,
        layout.sectorization?.cultura,
      );
      setLayout((l) => ({ ...l, sectorization }));
    },
    [layout.sprinklers, layout.centroid, layout.sectorization, physicalColumns, tempoPorSetorMinutos]
  );

  // TASK-060: lâmina/cultura são inputs do projetista — atualizam a sectorization
  // sem reconstruir setores (não alteram sectorIndices; só o relatório agronômico).
  const applyLamina = useCallback((laminaMm: number) => {
    if (!Number.isFinite(laminaMm) || laminaMm <= 0) return;
    setLayout((l) =>
      l.sectorization ? { ...l, sectorization: { ...l.sectorization, laminaMm } } : l,
    );
  }, []);

  const applyCultura = useCallback((cultura: string) => {
    setLayout((l) =>
      l.sectorization
        ? { ...l, sectorization: { ...l.sectorization, cultura: cultura.trim() || undefined } }
        : l,
    );
  }, []);

  const clearSectorization = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.sectorization;
      return next;
    });
    setSelectedSector(null);
  }, []);

  const initialCenter = initialLayout?.center
    ? {
        longitude: initialLayout.center.lng,
        latitude: initialLayout.center.lat,
        zoom: initialLayout.center.zoom,
      }
    : DEFAULT_CENTER;

  const sprinklerGeoJSON = useMemo(() => {
    if (!layout.sprinklers) return null;
    return {
      type: "FeatureCollection" as const,
      features: layout.sprinklers.positions.map(([lng, lat], i) => ({
        type: "Feature" as const,
        properties: {
          sector: layout.sectorization?.sectorIndices?.[i] ?? -1,
        },
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
      })),
    };
  }, [layout.sprinklers, layout.sectorization]);

  const sprinklerColorExpression = useMemo(() => {
    if (!layout.sectorization) return "#094641";
    const matchExpr: (string | number | string[])[] = [
      "match",
      ["get", "sector"],
    ];
    for (let i = 0; i < layout.sectorization.setoresCount; i++) {
      matchExpr.push(i, SECTOR_PALETTE[i % SECTOR_PALETTE.length]);
    }
    matchExpr.push("#094641");
    return matchExpr;
  }, [layout.sectorization]);

  // Opacity baseado em setor selecionado
  const sprinklerOpacityExpression = useMemo(() => {
    if (selectedSector === null) return 1;
    return [
      "case",
      ["==", ["get", "sector"], selectedSector],
      1,
      0.25,
    ];
  }, [selectedSector]);

  // Stroke baseado em setor selecionado
  const sprinklerStrokeWidthExpression = useMemo(() => {
    if (selectedSector === null) return 1.2;
    return [
      "case",
      ["==", ["get", "sector"], selectedSector],
      2,
      1,
    ];
  }, [selectedSector]);

  // Labels de setor ancorados em PhysicalColumn.startLngLat (TASK-014)
  const sectorLabelsGeoJSON = useMemo(() => {
    if (!layout.sprinklers || !layout.sectorization) return null;
    const byGroup: Record<number, [number, number][]> = {};
    layout.sprinklers.positions.forEach((pos, i) => {
      const s = layout.sectorization!.sectorIndices[i];
      if (s === undefined) return;
      if (!byGroup[s]) byGroup[s] = [];
      byGroup[s].push(pos);
    });

    const features = Object.entries(byGroup).map(([s, points]) => {
      const sectorIdx = parseInt(s);
      const anchor = resolveSectorLabelAnchor(sectorIdx, physicalColumns);
      const geometry = anchor
        ? { type: "Point" as const, coordinates: anchor }
        : turf.centroid(turf.featureCollection(points.map((p) => turf.point(p)))).geometry;
      return {
        type: "Feature" as const,
        properties: {
          label: String(sectorIdx + 1),
          sector: sectorIdx,
          isSelected: sectorIdx === selectedSector,
        },
        geometry,
      };
    });
    return turf.featureCollection(features);
  }, [layout.sprinklers, layout.sectorization, selectedSector, physicalColumns]);

  const pipelineCanStart = !!layout.waterSource;

  // Dados do setor selecionado para o card
  const selectedSectorData = useMemo(() => {
    if (
      selectedSector === null ||
      !layout.sprinklers ||
      !layout.sectorization
    ) {
      return null;
    }
    const indices = layout.sectorization.sectorIndices;
    const count = indices.filter((s) => s === selectedSector).length;
    const vazao = count * ASPERSOR_PADRAO.vazaoM3PorHora;
    return {
      number: selectedSector + 1,
      total: layout.sectorization.setoresCount,
      count,
      vazao,
      tempo: layout.sectorization.tempoPorSetorMinutos,
    };
  }, [selectedSector, layout.sprinklers, layout.sectorization]);

  return (
    // Workspace full-screen. Header = h-16 = 64px (sticky). 100dvh evita overflow em mobile/Safari onde 100vh inclui a barra do navegador.
    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] h-[calc(100dvh-64px)] bg-background overflow-hidden">
      <div className="relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialCenter}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onClick={handleMapClick}
          cursor={mode === "view" ? "grab" : "crosshair"}
          interactiveLayerIds={
            mode === "view" && layout.sprinklers ? ["sprinklers-circles"] : []
          }
          terrain={{ source: "mapbox-dem", exaggeration: 1 }}
          preserveDrawingBuffer={true}
          onLoad={(e) => {
            const map = e.target;
            if (!map.getSource("mapbox-dem")) {
              map.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
              });
            }
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl
            position="bottom-right"
            showCompass={false}
            style={{ marginRight: 12, marginBottom: 12 }}
          />

          {layout.area && (
            <Source id="area-src" type="geojson" data={layout.area}>
              <Layer
                id="area-fill"
                type="fill"
                paint={{ "fill-color": "#094641", "fill-opacity": 0.14 }}
              />
              <Layer
                id="area-line-outer"
                type="line"
                paint={{ "line-color": "#094641", "line-width": 2 }}
              />
              <Layer
                id="area-line-inner"
                type="line"
                paint={{
                  "line-color": "#5BC07A",
                  "line-width": 0.5,
                  "line-opacity": 0.9,
                  "line-offset": -3,
                }}
              />
            </Source>
          )}

          {hasPolygonInProgress && (
            <Source
              id="drawing-src"
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: drawingCoords },
              }}
            >
              <Layer
                id="drawing-line"
                type="line"
                paint={{
                  "line-color": "#094641",
                  "line-width": 2,
                  "line-dasharray": [2, 2],
                }}
              />
            </Source>
          )}

          {hasPolygonInProgress &&
            drawingCoords.map(([lng, lat], i) => (
              <Marker
                key={`poly-${i}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
              >
                <div className="w-3 h-3 bg-white border-2 border-[#094641] rounded-full shadow-sm" />
              </Marker>
            ))}          {isDrawingPipeline && drawingPipeline.length > 0 && (
            <>
              <Source
                id="pipeline-drawing-src"
                type="geojson"
                data={{
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: drawingPipeline,
                  },
                }}
              >
                <Layer
                  id="pipeline-drawing-line"
                  type="line"
                  paint={{
                    "line-color": "#1B5680",
                    "line-width": 2.5,
                    "line-dasharray": [2, 2],
                  }}
                  layout={{ "line-cap": "round", "line-join": "round" }}
                />
              </Source>
              {drawingPipeline.slice(1).map(([lng, lat], i) => (
                <Marker
                  key={`pipe-${i}`}
                  longitude={lng}
                  latitude={lat}
                  anchor="center"
                >
                  <div className="w-2.5 h-2.5 bg-white border-2 border-[#1B5680] rounded-full shadow-sm" />
                </Marker>
              ))}
            </>
          )}

          {coverageGeoJSON && (
            <Source id="coverage-src" type="geojson" data={coverageGeoJSON}>
              <Layer
                id="coverage-fill"
                type="fill"
                paint={{ "fill-color": "#094641", "fill-opacity": 0.15 }}
              />
              <Layer
                id="coverage-line"
                type="line"
                paint={{
                  "line-color": "#094641",
                  "line-opacity": 0.3,
                  "line-width": 0.6,
                }}
              />
            </Source>
          )}

          <Source
            id="sprinklers-src"
            type="geojson"
            data={sprinklerGeoJSON ?? { type: "FeatureCollection", features: [] }}
          >
            <Layer
              id="sprinklers-circles"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  12,
                  1.5,
                  16,
                  2.5,
                  20,
                  4,
                ],
                "circle-color": sprinklerColorExpression as any,
                "circle-opacity": sprinklerOpacityExpression as any,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": sprinklerStrokeWidthExpression as any,
                "circle-stroke-opacity": sprinklerOpacityExpression as any,
              }}
            />
          </Source>          <Source
            id="sector-labels-src"
            type="geojson"
            data={sectorLabelsGeoJSON ?? { type: "FeatureCollection", features: [] }}
          >
              <Layer
                id="sector-labels-circles"
                type="circle"
                minzoom={13}
                paint={{
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    13,
                    10,
                    16,
                    14,
                    20,
                    20,
                  ],
                  "circle-color": [
                    "case",
                    ["==", ["get", "isSelected"], true],
                    "#0A0A0A",
                    "rgba(10, 10, 10, 0.85)",
                  ],
                  "circle-stroke-color": "#FFFFFF",
                  "circle-stroke-width": 1.5,
                }}
              />
              <Layer
                id="sector-labels-text"
                type="symbol"
                minzoom={13}
                layout={{
                  "text-field": ["get", "label"],
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                  "text-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    13,
                    11,
                    16,
                    13,
                    20,
                    16,
                  ],
                  "text-allow-overlap": true,
                  "text-ignore-placement": true,
                }}
                paint={{
                  "text-color": "#FFFFFF",
                }}
              />
          </Source>





          {/* Lateral física: tubo real como polilinha pelos aspersores em ordem.
              Backbone contínuo — section_valves caem sobre esta linha. */}
          <Source id="physical-columns-src" type="geojson" data={physicalColumnsGeoJSON}>
            <Layer
              id="physical-columns-line"
              type="line"
              paint={{
                "line-color": "#BE185D",
                "line-width": 1,
                "line-opacity": 0.45,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>

          <Source
            id="laterais"
            type="geojson"
            data={{
              type: "FeatureCollection",
              features: laterais.map((lat) => ({
                type: "Feature",
                properties: {
                  sectorId: lat.sectorId,
                  comprimentoM: lat.comprimentoM,
                  vazaoM3h: lat.vazaoM3h,
                  diametroMm: lat.selecao.tubo.diametroMm,
                },
                geometry: {
                  type: "LineString",
                  coordinates: [lat.startLngLat, lat.endLngLat],
                },
              })),
            }}
          >
            <Layer
              id="laterais-line"
              type="line"
              paint={{
                "line-color": "#BE185D",
                "line-width": 1.5,
                "line-opacity": 0.85,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
          <Source
            id="pipeline-src"
            type="geojson"
            data={layout.mainPipeline ? {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: layout.mainPipeline.coordinates,
              },
            } : { type: "FeatureCollection" as const, features: [] }}
          >
            <Layer
              id="principal-casing"
              type="line"
              paint={{ "line-color": "#FFFFFF", "line-width": 6, "line-opacity": 0.85 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="principal-line"
              type="line"
              paint={{ "line-color": "#1B5680", "line-width": 3 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
          <Source
            id="adutora-src"
            type="geojson"
            data={layout.mainPipeline?.adutora && layout.mainPipeline.adutora.length >= 2 ? {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: layout.mainPipeline.adutora,
              },
            } : { type: "FeatureCollection" as const, features: [] }}
          >
            <Layer
              id="adutora-casing"
              type="line"
              paint={{ "line-color": "#FFFFFF", "line-width": 5, "line-opacity": 0.85 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="adutora-line"
              type="line"
              paint={{ "line-color": "#7C3AED", "line-width": 2.5 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            {/* W-UX (diagnóstico 2026-05-24): label 'Adutora' no meio da linha,
                acompanhando a inclinação geográfica. minzoom para evitar poluir
                a overview. */}
            <Layer
              id="adutora-label"
              type="symbol"
              minzoom={13}
              layout={{
                "symbol-placement": "line-center",
                "text-field": "Adutora",
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                "text-size": 11,
                "text-letter-spacing": 0.05,
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              }}
              paint={{
                "text-color": "#7C3AED",
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.8,
              }}
            />
          </Source>

          {/* Camada de ramais (principal → lateral_inlet) — teal, apenas quando existem */}
          <Source id="secondaries-src" type="geojson" data={secondariesGeoJSON}>
            <Layer
              id="secondaries-casing"
              type="line"
              paint={{ "line-color": "#FFFFFF", "line-width": 4, "line-opacity": 0.8 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="secondaries-line"
              type="line"
              paint={{ "line-color": "#0D9F6E", "line-width": 2, "line-dasharray": [3, 1.5] }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>

          {/* Laterais físicas órfãs (sem conexão hidráulica) — vermelho de alerta */}
          <Source
            id="orphan-laterais-src"
            type="geojson"
            data={{
              type: "FeatureCollection" as const,
              features: physicalColumns
                .filter((col) => connectivityReport?.orphanPhysicalColumns.includes(col.id))
                .map((col) => ({
                  type: "Feature" as const,
                  properties: { id: col.id },
                  geometry: { type: "LineString" as const, coordinates: [col.startLngLat, col.endLngLat] },
                })),
            }}
          >
            <Layer
              id="orphan-laterais-line"
              type="line"
              paint={{ "line-color": "#EF4444", "line-width": 3, "line-opacity": 0.9 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>

          {/* Camada de pontos de controle — válvulas pendentes (section_valve) */}
          <Source
            id="control-points-src"
            type="geojson"
            data={{
              type: "FeatureCollection",
              features: controlPoints
                .filter((cp) => cp.type === "section_valve")
                .map((cp) => ({
                  type: "Feature" as const,
                  properties: { status: cp.status, type: cp.type },
                  geometry: { type: "Point" as const, coordinates: cp.coordinate },
                })),
            }}
          >
            <Layer
              id="control-points-halo"
              type="circle"
              minzoom={13}
              paint={{
                "circle-radius": 7,
                "circle-color": "#FFFFFF",
                "circle-opacity": 0.9,
              }}
            />
            <Layer
              id="control-points-dot"
              type="circle"
              minzoom={13}
              paint={{
                "circle-radius": 4,
                "circle-color": "#E07B00",
                "circle-stroke-color": "#B85C00",
                "circle-stroke-width": 1.5,
              }}
            />
            <Layer
              id="control-points-label"
              type="symbol"
              minzoom={15}
              layout={{
                "text-field": "Reg. seção",
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                "text-size": 10,
                "text-offset": [0, -1.4],
                "text-anchor": "bottom",
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              }}
              paint={{
                "text-color": "#B85C00",
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.5,
              }}
            />
          </Source>

          {layout.waterSource && (
            <Marker
              longitude={layout.waterSource.lng}
              latitude={layout.waterSource.lat}
              anchor="bottom"
            >
              <MarkerPin
                highlighted={mode === "water"}
                compound={!layout.pumpSeparate}
              >
                <Droplets className="w-4 h-4 text-white" strokeWidth={2.5} />
              </MarkerPin>
            </Marker>
          )}

          {layout.pumpSeparate && layout.pumpLocation && (
            <Marker
              longitude={layout.pumpLocation.lng}
              latitude={layout.pumpLocation.lat}
              anchor="bottom"
            >
              <MarkerPin highlighted={mode === "pump"}>
                <Wrench className="w-4 h-4 text-white" strokeWidth={2.5} />
              </MarkerPin>
            </Marker>
          )}
          {searchMarker && (
            <Marker longitude={searchMarker.lng} latitude={searchMarker.lat} anchor="bottom">
              <MapPin className="w-5 h-5 text-orange-500 drop-shadow" />
            </Marker>
          )}
        </Map>

        {showSearch && (
          <MapSearchControl
            onLocationFound={handleLocationFound}
            onUseAsWaterSource={handleUseAsWaterSource}
            onClose={() => { setShowSearch(false); setSearchMarker(null); }}
          />
        )}

        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-border rounded-md p-1 shadow-lg">
          <ToolButton
            active={mode === "view"}
            onClick={() => {
              setMode("view");
              setDrawingCoords([]);
              setDrawingPipeline([]);
            }}
            icon={<MousePointer2 className="w-4 h-4" />}
            label="Navegar"
          />
          <ToolButton
            active={showSearch}
            onClick={() => setShowSearch((v) => !v)}
            icon={<Search className="w-4 h-4" />}
            label="Localizar"
          />
          <div className="w-px h-5 bg-border mx-0.5" />
          <ToolButton
            active={mode === "polygon"}
            onClick={() => setMode("polygon")}
            icon={<Hexagon className="w-4 h-4" />}
            label="Área irrigada"
          />
          <ToolButton
            active={mode === "water"}
            onClick={() => setMode("water")}
            icon={<Droplets className="w-4 h-4" />}
            label="Captação"
          />
          {layout.pumpSeparate && (
            <ToolButton
              active={mode === "pump"}
              onClick={() => setMode("pump")}
              icon={<Wrench className="w-4 h-4" />}
              label="Casa de bomba"
            />
          )}
          <div className="w-px h-5 bg-border mx-0.5" />
          <ToolButton
            active={mode === "pipeline"}
            onClick={enterPipelineMode}
            disabled={!pipelineCanStart}
            icon={<Spline className="w-4 h-4" />}
            label="Tubulação"
            tooltip={
              pipelineCanStart
                ? undefined
                : "Marque a captação antes de traçar a tubulação"
            }
          />
          <div className="w-px h-5 bg-border mx-0.5" />
          <ToolButton
            active={showMemorial}
            onClick={() => setShowMemorial((v) => !v)}
            icon={<BookOpen className="w-4 h-4" />}
            label="Memorial"
          />
          <button
            onClick={handleExportPDF}
            disabled={!bom || pdfLoading}
            title={bom ? "Exportar proposta em PDF" : "Conclua a tubulação para exportar"}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-[10px] font-medium transition-colors select-none",
              bom && !pdfLoading
                ? "text-ink-2 hover:bg-surface-hover hover:text-ink cursor-pointer"
                : "text-ink-4 cursor-not-allowed opacity-40",
            )}
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>{pdfLoading ? "…" : "PDF"}</span>
          </button>
        </div>

        {showMemorial && (
          <MemorialPanel
            laterais={laterais}
            projectName={projectName}
            client={client}
            city={city}
            state={state}
            onClose={() => setShowMemorial(false)}
          />
        )}

        {hasPolygonInProgress && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white border border-border rounded-md shadow-lg flex items-center gap-1 p-1">
            <span className="px-3 text-xs text-ink-2 font-mono">
              {drawingCoords.length} vértice
              {drawingCoords.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={cancelPolygon}
              className="px-3 py-1.5 text-xs text-ink-2 hover:bg-surface rounded-sm font-medium flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              onClick={finishPolygon}
              disabled={drawingCoords.length < 3}
              className="px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover text-white rounded-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              Finalizar área
            </button>
          </div>
        )}

        {isDrawingPipeline && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white border border-border rounded-md shadow-lg flex items-center gap-1 p-1">
            <span className="px-3 text-xs text-ink-2 font-mono">
              {drawingPipeline.length - 1} vértice
              {drawingPipeline.length - 1 !== 1 ? "s" : ""}
              {drawingPipeline.length >= 2 && (
                <span className="ml-2 text-ink-3">
                  · {calculatePipelineLength(drawingPipeline).toFixed(0)} m
                </span>
              )}
            </span>
            <button
              onClick={undoPipelineVertex}
              disabled={drawingPipeline.length <= 1}
              className="px-3 py-1.5 text-xs text-ink-2 hover:bg-surface rounded-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </button>
            <button
              onClick={cancelPipeline}
              className="px-3 py-1.5 text-xs text-ink-2 hover:bg-surface rounded-sm font-medium flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              onClick={finishPipeline}
              disabled={!hasPipelineInProgress}
              className="px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover text-white rounded-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              Finalizar tubulação
            </button>
          </div>
        )}

        {/* Alerta de corredor não validado */}
        {layout.mainPipeline && layout.mainPipeline.corridorValidated === false && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-amber-600/90 text-white text-[10px] font-medium uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
              Traçado automático de tubulação pendente de validação de campo.
            </div>
          </div>
        )}

        {/* Botão de toggle do sidebar — visível apenas em mobile (md:hidden) */}
        <button
          className="absolute bottom-4 right-16 z-10 md:hidden min-h-[44px] min-w-[44px] bg-white/95 backdrop-blur-sm border border-border rounded-md shadow-md px-3 py-2 text-xs text-ink flex items-center gap-1.5"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-expanded={sidebarOpen}
          aria-controls="project-layout-drawer"
          aria-label={sidebarOpen ? "Fechar painel de layout do projeto" : "Abrir painel de layout do projeto"}
        >
          <Spline className="w-3.5 h-3.5" />
          <span>Layout</span>
        </button>

        {/* Legenda técnica mínima */}
        {layout.sprinklers && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-border rounded-md shadow-md px-3 py-2 pointer-events-none">
            <div className="text-[9px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-1.5">Legenda</div>
            <div className="space-y-1">
              {layout.mainPipeline?.adutora && (
                <LegendRow color="#7C3AED" label="Adutora" />
              )}
              {layout.mainPipeline && (
                <LegendRow color="#1B5680" label="Principal" />
              )}
              {secondaries.length > 0 && (
                <LegendRow color="#0D9F6E" label="Ramal/secundária" dashed />
              )}
              <LegendRow color="#BE185D" label="Lateral física (tubo real)" thin />
              {laterais.length > 0 && (
                <LegendRow color="#BE185D" label="Trecho operacional (setor ativo)" />
              )}
              {controlPoints.some((cp) => cp.type === "section_valve") && (
                <LegendRow color="#E07B00" label="Registro de seção" dot />
              )}
            </div>
          </div>
        )}

        <SaveStatus saving={saving} savedAt={savedAt} />
      </div>

      {/* Overlay mobile — fecha o drawer ao clicar fora */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="project-layout-drawer"
        className={clsx(
          "border-l border-border bg-surface p-6 overflow-y-auto",
          // Mobile: drawer fixo saindo de baixo
          "fixed bottom-0 left-0 right-0 z-40 h-[60dvh]",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-y-0" : "translate-y-full",
          // Desktop: estático no grid, ocupa a altura inteira da row
          "md:static md:h-full md:translate-y-0 md:z-auto md:transition-none",
        )}
      >
        {/* ── Header do projeto ────────────────────────────────── */}
        <div className="-mx-6 -mt-6 px-6 py-4 border-b border-border mb-5">
          <Link
            href="/projetos"
            className="text-[11px] text-ink-3 hover:text-ink-2 inline-block mb-2 transition-colors"
          >
            ← Projetos
          </Link>
          {projectName && (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink leading-snug truncate">
                  {projectName}
                </h2>
                {(client || city || state) && (
                  <div className="text-[11px] text-ink-3 mt-0.5 truncate">
                    {[client, [city, state].filter(Boolean).join("/")]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
              {statusLabel && (
                <span className="flex-shrink-0 inline-block px-2 py-0.5 rounded-sm text-[10px] font-medium border border-border bg-background text-ink-2 uppercase tracking-[0.08em]">
                  {statusLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Feedback do gate de PDF (TASK-058) ──────────────────────────────
            Renderizado SEMPRE que o último attempt de PDF retornou 422,
            independente da partição rt-pending/data-block abaixo. Antes, este
            feedback ficava aninhado no painel data-block — quando todos os
            blockers eram rt-pending, o 422 não produzia nenhum feedback
            visível (regressão B-05/W-08 identificada no diagnóstico
            2026-06-11). ──────────────────────────────────────────────────── */}
        {pdfError?.kind === "blocked" && (
          <div className="mb-5 bg-red-50 border border-red-300 rounded-md p-3">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-[0.08em] mb-1">
              PDF bloqueado pela governança
            </p>
            <p className="text-[10px] text-red-600/80 mb-1 leading-snug">
              A proposta não foi gerada: há {pdfError.blockers.length} pendência(s) ativa(s).
              Resolva os itens listados nos painéis abaixo antes de emitir.
            </p>
            {pdfError.invalidHydraulicSegments.length > 0 && (
              <div className="mt-2 border-t border-red-200 pt-2">
                <p className="text-[11px] font-semibold text-red-700 mb-1.5">
                  Segmentos inválidos ({pdfError.invalidHydraulicSegments.length}
                  {pdfError.invalidHydraulicSegments.length > 3 ? " — exibindo 3 primeiros" : ""}):
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pdfError.invalidHydraulicSegments.slice(0, 3).map((seg) => (
                    <div key={seg.id} className="bg-red-100 rounded p-1.5 font-mono text-[10px] leading-snug">
                      <div className="font-sans font-semibold text-[10px] mb-0.5 text-red-800">
                        {seg.type} · {REJECTION_REASON_LABEL[seg.rejectionReason] ?? seg.rejectionReason}
                      </div>
                      <div>
                        DN {seg.diameterNominalMm}mm
                        {seg.internalDiameterMm != null && ` (Øint ${seg.internalDiameterMm}mm)`}
                        {" · "}Q {seg.flowM3h.toFixed(1)} m³/h
                      </div>
                      <div>
                        v {seg.velocityMs.toFixed(2)} m/s{" > lim "}{seg.maxVelocityMs.toFixed(1)} m/s
                      </div>
                      <div>
                        hf {seg.headLossMca.toFixed(2)} mca
                        {seg.maxHeadLossMca != null && ` > lim ${seg.maxHeadLossMca.toFixed(1)} mca`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setPdfError(null)}
              className="mt-2 text-[10px] text-red-400 hover:text-red-600"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* ── Blockers (B-05 + W-08: separados por categoria) ─────────────────
            Particiona blockers em (a) rt-pending — aguarda decisão técnica
            (RT/engenheiro) e (b) data-block — erro corrigível pelo projetista.
            O conteúdo de projectResult.diagnostics.blockers continua intocado;
            a separação é puramente visual. Sempre que ambos os grupos têm
            itens, mostramos primeiro o data-block (mais acionável agora) e
            depois o rt-pending. ────────────────────────────────────────────── */}
        {(() => {
          const allBlockers = projectResult.diagnostics?.blockers ?? [];
          if (allBlockers.length === 0) return null;
          const { rtPending, dataBlock } = partitionBlockers(allBlockers);
          return (
            <>
              {dataBlock.length > 0 && (
                <div className="mb-5 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-[11px] font-semibold text-red-700 uppercase tracking-[0.08em] mb-1">
                    Bloqueio do projeto
                  </p>
                  <p className="text-[10px] text-red-600/80 mb-2 leading-snug">
                    Corrigir os dados abaixo antes de gerar a proposta.
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {dataBlock.map((b, i) => (
                      <li key={`db-${i}`} className="text-xs text-red-700 flex items-start gap-1.5">
                        <span className="flex-shrink-0 mt-0.5">·</span>
                        <span>{b.message}</span>
                      </li>
                    ))}
                  </ul>
                  {/* Detalhes de segmentos inválidos do PDF: movidos para o banner
                      "PDF bloqueado pela governança" acima (TASK-058) — renderiza
                      mesmo quando este painel data-block está vazio. */}
                </div>
              )}
              {rtPending.length > 0 && (
                <div className="mb-5 bg-sky-50 border border-sky-200 rounded-md p-3">
                  <p className="text-[11px] font-semibold text-sky-800 uppercase tracking-[0.08em] mb-1">
                    Aguarda decisão técnica (RT)
                  </p>
                  <p className="text-[10px] text-sky-700/80 mb-2 leading-snug">
                    Não é erro de projeto — itens que dependem de revisão do RT, engenheiro
                    ou homologação de catálogo antes de gerar a proposta comercial.
                  </p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {rtPending.map((b, i) => (
                      <li key={`rt-${i}`} className="text-xs text-sky-800 flex items-start gap-1.5">
                        <span className="flex-shrink-0 mt-0.5">·</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{b.audienceHint}</span>
                          <span className="text-sky-700/80 text-[11px] leading-snug">
                            {b.message}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Erro técnico inesperado do PDF ───────────────────── */}
        {pdfError?.kind === "technical" && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-xs text-red-700">
              Erro técnico ao gerar o PDF. Tente novamente ou contacte o suporte.
            </p>
            <button
              onClick={() => setPdfError(null)}
              className="mt-1.5 text-[10px] text-red-400 hover:text-red-600"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* ── Warnings (derivados de projectResult.diagnostics) ── */}
        {(projectResult.diagnostics?.warnings.length ?? 0) > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-[0.08em] mb-2">
              Avisos
            </p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {projectResult.diagnostics!.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                  <span className="flex-shrink-0 mt-0.5">·</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Layout do projeto ─────────────────────────────────── */}
        <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-5">
          Layout do projeto
        </h3>

        <div className="space-y-5">
          <SidebarItem
            label="Área irrigada"
            value={
              layout.areaHectares
                ? `${layout.areaHectares.toFixed(2)} ha`
                : "Não desenhada"
            }
            active={!!layout.area}
            onRemove={layout.area ? clearArea : undefined}
            extra={
              layout.perimeterMeters !== undefined && (
                <span className="font-mono text-[11px] text-ink-3">
                  Perímetro · {layout.perimeterMeters.toFixed(0)} m
                </span>
              )
            }
          />

          <SidebarItem
            label="Captação (fonte hídrica)"
            value={
              layout.waterSource
                ? `Lat ${layout.waterSource.lat.toFixed(4)} · Lng ${layout.waterSource.lng.toFixed(4)}`
                : "Não marcada"
            }
            mono={!!layout.waterSource}
            active={!!layout.waterSource}
            onRemove={layout.waterSource ? removeWater : undefined}
            extra={
              layout.waterSource?.elevation !== undefined ? (
                <span className="font-mono text-[11px] text-ink-3 inline-flex items-center gap-1">
                  <Mountain className="w-3 h-3" />
                  Cota · {layout.waterSource.elevation.toFixed(0)} m
                </span>
              ) : null
            }
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.1em]">
                Bomba
              </span>
              <button
                onClick={togglePumpSeparate}
                className="text-[11px] text-ink-3 hover:text-ink uppercase tracking-wider"
              >
                {layout.pumpSeparate
                  ? "Unificar com captação"
                  : "Separar da captação"}
              </button>
            </div>
            {!layout.pumpSeparate ? (
              <div className="text-xs text-ink-2 italic">
                Posicionada junto da captação por padrão.
              </div>
            ) : layout.pumpLocation ? (
              <div className="group">
                <div className="font-mono text-xs text-ink">
                  {layout.pumpLocation.lng.toFixed(4)},{" "}
                  {layout.pumpLocation.lat.toFixed(4)}
                </div>
                {layout.pumpLocation.elevation !== undefined && (
                  <span className="font-mono text-[11px] text-ink-3 inline-flex items-center gap-1 mt-0.5">
                    <Mountain className="w-3 h-3" />
                    Cota · {layout.pumpLocation.elevation.toFixed(0)} m
                  </span>
                )}
                <button
                  onClick={removePumpSeparate}
                  className="block mt-1 text-[11px] text-ink-4 hover:text-danger uppercase tracking-wider"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="text-xs text-ink-4 italic">
                Use o modo Casa de bomba na toolbar.
              </div>
            )}
          </div>

          {layout.geodetic?.distanceSourceToAreaMeters !== undefined && (
            <div className="pt-4 border-t border-border space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.1em] block mb-1">
                  Distância captação → área
                </span>
                <span className="font-mono text-sm text-ink inline-flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-ink-3" />
                  {layout.geodetic.distanceSourceToAreaMeters.toFixed(0)} m
                </span>
              </div>
              {layout.geodetic.elevationDeltaMeters !== undefined && (
                <div>
                  <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.1em] block mb-1">
                    Desnível geométrico
                  </span>
                  <span
                    className={clsx(
                      "font-mono text-sm inline-flex items-center gap-1.5",
                      layout.geodetic.elevationDeltaMeters >= 0
                        ? "text-ink"
                        : "text-ink-2"
                    )}
                  >
                    <Mountain className="w-3.5 h-3.5 text-ink-3" />
                    {layout.geodetic.elevationDeltaMeters >= 0 ? "+" : ""}
                    {layout.geodetic.elevationDeltaMeters.toFixed(1)} m
                  </span>
                </div>
              )}
            </div>
          )}

          {layout.geocoded?.city && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.1em]">
                  Município detectado
                </span>
                <ApplyCityButton
                  projectId={projectId}
                  city={layout.geocoded.city}
                  state={layout.geocoded.state}
                />
              </div>
              <span className="text-sm text-ink">
                {layout.geocoded.city}
                {layout.geocoded.state && ` / ${layout.geocoded.state}`}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em]">
              Tubulação principal
            </h3>
            {layout.mainPipeline && (
              <button
                onClick={clearPipeline}
                className="text-[11px] text-ink-4 hover:text-danger uppercase tracking-wider"
              >
                Remover
              </button>
            )}
          </div>

          {!layout.mainPipeline ? (
            <button
              onClick={enterPipelineMode}
              disabled={!pipelineCanStart}
              className="w-full px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Spline className="w-4 h-4" />
              Traçar caminho da captação até a área
            </button>
          ) : (
            <div className="bg-background border border-border rounded-sm p-3 space-y-3">
              {/* Badge de origem do traçado */}
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium",
                    layout.mainPipeline.source === "manual"
                      ? "bg-success-soft text-success"
                      : layout.mainPipeline.corridorValidated
                        ? "bg-success-soft text-success"
                        : "bg-amber-50 text-amber-700 border border-amber-200",
                  )}
                >
                  {layout.mainPipeline.source === "manual"
                    ? "Manual"
                    : layout.mainPipeline.corridorValidated
                      ? "Auto · Validado"
                      : "Auto · Pendente"}
                </span>
                {layout.mainPipeline.source === "auto" && (
                  <button
                    onClick={resetToAutoPipeline}
                    title="Recalcular traçado automático"
                    className="text-[11px] text-ink-3 hover:text-ink inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Auto
                  </button>
                )}
                {/* TASK-061: caminho de volta manual → motor (resolve a causa de
                    ângulos não-construtíveis em traçados manuais diagonais) */}
                {layout.mainPipeline.source === "manual" && (
                  <button
                    onClick={resetToAutoPipeline}
                    title="Substituir o traçado manual pela sugestão do motor de arquitetura (A0/A2/A3)"
                    className="text-[11px] text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Usar traçado do motor
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-0.5">
                    Principal
                  </div>
                  <div className="text-sm font-mono text-ink font-medium">
                    {layout.mainPipeline.lengthMeters.toFixed(0)} m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-0.5">
                    Adutora
                  </div>
                  <div className="text-sm font-mono text-ink font-medium">
                    {bom?.meta.comprimentoAdutoraM
                      ? `${bom.meta.comprimentoAdutoraM.toFixed(0)} m`
                      : "—"}
                  </div>
                </div>
                {secondaries.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-0.5">
                      Ramais de conexão
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono text-[#0D9F6E] font-medium">
                        {secondaries.reduce((s, r) => s + r.lengthM, 0).toFixed(0)} m
                      </div>
                      <span className="text-[10px] text-ink-3">
                        {secondaries.length} ramal{secondaries.length > 1 ? "is" : ""}
                      </span>
                    </div>
                  </div>
                )}
                {/* TASK-061: transparência da seleção arquitetural A0/A2/A3 —
                    antes o vencedor era aplicado silenciosamente e o resultado descartado */}
                {archSelection && layout.mainPipeline.source === "auto" && (
                  <div className="col-span-2 bg-background border border-border rounded-sm p-2">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-1">
                      Arquitetura da rede (motor A0/A2/A3)
                    </div>
                    <div className="text-xs text-ink mb-1">
                      <span className="font-semibold">{archSelection.winner}</span>
                      {" — "}
                      <span className="text-ink-2">{archSelection.winnerCandidate.description}</span>
                    </div>
                    <div className="space-y-0.5">
                      {archSelection.evaluations.map((ev) => (
                        <div
                          key={ev.candidate.id}
                          className={clsx(
                            "flex items-center justify-between text-[11px] font-mono",
                            ev.candidate.id === archSelection.winner ? "text-ink font-semibold" : "text-ink-3",
                          )}
                        >
                          <span>
                            {ev.candidate.id === archSelection.winner ? "● " : "· "}
                            {ev.candidate.id}
                            {!ev.isValid && " (inválido)"}
                          </span>
                          <span>
                            {ev.isValid
                              ? `score R$ ${ev.scoreFinal.toFixed(0)}`
                              : ev.invalidReason?.slice(0, 28) ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {archSelection.winnerCandidate ? (
                      <p className="text-[10px] text-ink-3 mt-1 leading-snug">{archSelection.reason}</p>
                    ) : null}
                  </div>
                )}
                {connectivityReport && connectivityReport.disconnectedColumnsCount > 0 && (
                  <div className="col-span-2 bg-red-50 border border-red-200 rounded-sm p-2">
                    <div className="text-[10px] font-medium text-red-700 uppercase tracking-wider mb-0.5">
                      Laterais desconectadas
                    </div>
                    <div className="text-xs text-red-600">
                      {connectivityReport.disconnectedColumnsCount} lateral{connectivityReport.disconnectedColumnsCount > 1 ? "is" : ""} sem conexão hidráulica
                    </div>
                  </div>
                )}
                {layout.mainPipeline.elevationDeltaM !== undefined && (
                  <div className="col-span-2 pt-2 border-t border-border">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-0.5">
                      Desnível percorrido
                    </div>
                    <span
                      className={clsx(
                        "text-sm font-mono inline-flex items-center gap-1.5",
                        layout.mainPipeline.elevationDeltaM >= 0
                          ? "text-ink"
                          : "text-ink-2"
                      )}
                    >
                      <Mountain className="w-3.5 h-3.5 text-ink-3" />
                      {layout.mainPipeline.elevationDeltaM >= 0 ? "+" : ""}
                      {layout.mainPipeline.elevationDeltaM.toFixed(1)} m
                    </span>
                    <span className="block text-[10px] font-mono text-ink-4 mt-0.5">
                      Início {layout.mainPipeline.elevationStartM?.toFixed(0) ?? "—"} m
                      → fim {layout.mainPipeline.elevationEndM?.toFixed(0) ?? "—"} m
                    </span>
                  </div>
                )}
              </div>
              {/* Corredor: validar ou desfazer validação */}
              {layout.mainPipeline.source === "auto" &&
                !layout.mainPipeline.corridorValidated && (
                  <button
                    onClick={validateCorridor}
                    className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Validar corredor em campo
                  </button>
                )}
              {layout.mainPipeline.corridorValidated && (
                <button
                  onClick={invalidateCorridor}
                  className="w-full px-3 py-2 border border-border text-ink-3 hover:text-danger hover:border-danger rounded-sm text-xs font-medium transition-colors"
                >
                  Desfazer validação
                </button>
              )}
              <button
                onClick={enterPipelineMode}
                className="w-full px-3 py-2 border border-border hover:border-border-strong text-ink-2 rounded-sm text-xs font-medium transition-colors"
              >
                Refazer traçado (manual)
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-4">
            Aspersores
          </h3>

          <div className="bg-background border border-border rounded-sm p-3 mb-3">
            <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-1">
              Modelo selecionado
            </div>
            <div className="text-sm text-ink font-medium mb-2">
              {ASPERSOR_PADRAO.modelo}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-ink-3">
              <span>Bocal · {ASPERSOR_PADRAO.bocal}</span>
              <span>P · {ASPERSOR_PADRAO.pressaoServicoMca} mca</span>
              <span>Q · {ASPERSOR_PADRAO.vazaoM3PorHora} m³/h</span>
              <span>R · {ASPERSOR_PADRAO.raioMolhadoM} m</span>
            </div>
          </div>

          {!layout.sprinklers ? (
            <button
              onClick={positionSprinklers}
              disabled={!layout.area}
              className="w-full px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Posicionar grade {ASPERSOR_PADRAO.espacamentoPadraoM}×
              {ASPERSOR_PADRAO.espacamentoPadraoM} m
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background border border-border rounded-sm p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-1">
                    Aspersores
                  </div>
                  <div className="text-lg font-semibold text-ink">
                    {layout.sprinklers.count}
                  </div>
                </div>
                <div className="bg-background border border-border rounded-sm p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-1">
                    Vazão de projeto
                  </div>
                  <div className="text-lg font-semibold text-ink font-mono">
                    {layout.sprinklers.vazaoProjetoM3PorHora.toFixed(1)}{" "}
                    <span className="text-xs text-ink-3 font-sans">m³/h</span>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                      Orientação · {layout.sprinklers.gridAngleDegrees}°
                    </span>
                    <span
                      className={clsx(
                        "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
                        layout.sprinklers.angleMode === "auto"
                          ? "bg-success-soft text-success"
                          : layout.sprinklers.angleMode === "optimizer"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-surface-2 text-ink-2"
                      )}
                    >
                      {layout.sprinklers.angleMode === "auto"
                        ? "Auto"
                        : layout.sprinklers.angleMode === "optimizer"
                        ? "Motor"
                        : "Manual"}
                    </span>
                  </div>
                  {(layout.sprinklers.angleMode === "manual" || layout.sprinklers.angleMode === "optimizer") && (
                    <button
                      onClick={resetToAutoAngle}
                      title="Voltar para automático"
                      className="text-[11px] text-ink-3 hover:text-ink inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min="0"
                  max="89"
                  step="1"
                  value={layout.sprinklers.gridAngleDegrees}
                  onChange={(e) =>
                    updateGridAngle(parseInt(e.target.value, 10), "manual")
                  }
                  className="w-full angle-slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-ink-4 mt-1">
                  <span>0°</span>
                  <span>45°</span>
                  <span>89°</span>
                </div>
              </div>

              {layout.sprinklers.angleMode === "optimizer" && (
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1.5 leading-relaxed">
                  Layout gerado por motor geométrico preliminar — não homologado tecnicamente.
                </div>
              )}

              <button
                onClick={() => setShowCoverage(!showCoverage)}
                className={clsx(
                  "w-full px-3 py-2.5 border rounded-sm text-sm flex items-center justify-between transition-colors",
                  showCoverage
                    ? "bg-ink text-white border-ink"
                    : "bg-background text-ink-2 border-border hover:border-border-strong hover:text-ink"
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  {showCoverage ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  Cobertura · raio {ASPERSOR_PADRAO.raioMolhadoM} m
                </span>
                <span
                  className={clsx(
                    "text-[10px] uppercase tracking-[0.1em]",
                    showCoverage ? "text-white/60" : "text-ink-4"
                  )}
                >
                  {showCoverage ? "Visível" : "Oculta"}
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={positionSprinklers}
                  className="flex-1 px-3 py-2 border border-border hover:border-border-strong text-ink-2 rounded-sm text-xs font-medium transition-colors"
                >
                  Reposicionar
                </button>
                <button
                  onClick={clearSprinklers}
                  className="px-3 py-2 text-ink-3 hover:text-danger rounded-sm text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* ── Motor de candidatos geométricos ─────────────────────────── */}
          {layout.area && optimizerState.status === "idle" && (
            <button
              onClick={runOptimizer}
              className="mt-3 w-full px-3 py-2 border border-border hover:border-border-strong text-ink-2 hover:text-ink rounded-sm text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gerar candidato geométrico
            </button>
          )}

          {optimizerState.status === "running" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              Calculando candidatos geométricos…
            </div>
          )}

          {optimizerState.status === "hydraulic_running" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              Validando hidráulica dos melhores candidatos…
            </div>
          )}

          {optimizerState.status === "error" && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-sm p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-red-700 leading-relaxed">{optimizerState.message}</p>
                <button
                  onClick={dismissOptimizer}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {optimizerState.status === "ready" && (() => {
            const { best, selectionReason } = optimizerState.result;
            return (
              <div className="mt-3 border border-amber-200 bg-amber-50 rounded-sm p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    Candidato geométrico preliminar
                  </span>
                  <button
                    onClick={dismissOptimizer}
                    className="text-amber-500 hover:text-amber-700 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-amber-700 font-medium">
                  Candidato geométrico preliminar — não homologado tecnicamente.
                </p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-ink-2">
                  <span><span className="text-ink-4 font-sans">Ângulo</span> {best.angleDegrees}°</span>
                  <span><span className="text-ink-4 font-sans">Score</span> {best.score.total.toFixed(3)}</span>
                  <span><span className="text-ink-4 font-sans">Aspersores</span> {best.score.sprinklerCount}</span>
                  <span><span className="text-ink-4 font-sans">Filling</span> {(best.score.fillingRatio * 100).toFixed(0)}%</span>
                  <span><span className="text-ink-4 font-sans">Offset X</span> {best.offsetXm.toFixed(1)} m</span>
                  <span><span className="text-ink-4 font-sans">Offset Y</span> {best.offsetYm.toFixed(1)} m</span>
                  <span><span className="text-ink-4 font-sans">Col. curtas</span> {best.score.shortColumnCount}</span>
                  <span><span className="text-ink-4 font-sans">Borda</span> {(best.score.edgeQualityScore * 100).toFixed(0)}%</span>
                </div>

                <div className="border-t border-amber-200 pt-2 space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">
                    Comprimento geométrico de laterais
                  </p>
                  <p className="text-[9px] text-amber-500 leading-tight">
                    Não inclui principal, adutora nem ramais até captação.
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-ink-2">
                    <span><span className="text-ink-4 font-sans">Total</span> {best.score.totalLateralLengthM.toFixed(0)} m</span>
                    <span><span className="text-ink-4 font-sans">Média/col.</span> {best.score.avgLateralLengthM.toFixed(0)} m</span>
                    <span><span className="text-ink-4 font-sans">Máx. col.</span> {best.score.maxLateralLengthM.toFixed(0)} m</span>
                    <span><span className="text-ink-4 font-sans">Por asp.</span> {best.score.lateralLengthPerSprinklerM.toFixed(1)} m</span>
                    <span className="col-span-2"><span className="text-ink-4 font-sans">Por ha</span> {best.score.lateralLengthPerHectareM.toFixed(0)} m/ha</span>
                  </div>
                </div>

                {best.score.secondaryLengthM !== null ? (
                  <div className="border-t border-amber-200 pt-2 space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">
                      Rede de distribuição — preliminar
                    </p>
                    <p className="text-[9px] text-amber-500 leading-tight">
                      Comprimentos geométricos. Não substitui hidráulica, BOM ou validação técnica.
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-ink-2">
                      <span><span className="text-ink-4 font-sans">Principal</span> {best.score.principalLengthM!.toFixed(0)} m</span>
                      <span><span className="text-ink-4 font-sans">Adutora</span> {best.score.adutoraLengthM!.toFixed(0)} m</span>
                      <span><span className="text-ink-4 font-sans">Ramais</span> {best.score.secondaryLengthM.toFixed(0)} m</span>
                      <span><span className="text-ink-4 font-sans">Rede total</span> {best.score.totalNetworkLengthM!.toFixed(0)} m</span>
                      <span><span className="text-ink-4 font-sans">Dist/Lat</span> {best.score.distributionLengthRatio!.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-600 italic">
                    Defina a captação para incluir métricas de rede de distribuição.
                  </p>
                )}

                {/* ── Validação hidráulica Top K ───────────────────────────── */}
                {best.score.hydraulicEvaluationStatus !== null ? (
                  <div className="border-t border-amber-200 pt-2 space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">
                      Validação hidráulica — Top K candidatos
                    </p>
                    <p className="text-[9px] text-amber-500 leading-tight">
                      Usa o mesmo solver do projeto final. Apenas os melhores candidatos foram avaliados.
                    </p>
                    {best.score.hydraulicEvaluationStatus === "evaluated_no_blockers" && (
                      <p className="text-[11px] text-green-700 font-medium">
                        ✓ Sem blockers. HMT: {best.score.hydraulicHmtRequiredMca !== null ? `${best.score.hydraulicHmtRequiredMca.toFixed(1)} mca` : "n/a"}
                      </p>
                    )}
                    {best.score.hydraulicEvaluationStatus === "evaluated_has_blockers" && (
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-red-700 font-medium">
                          ✗ {best.score.hydraulicBlockers!.length} blocker(s) encontrado(s).
                        </p>
                        {best.score.hydraulicBlockers!.slice(0, 3).map((b, idx) => (
                          <p key={idx} className="text-[10px] text-red-600 leading-tight">{b.message}</p>
                        ))}
                      </div>
                    )}
                    {best.score.hydraulicEvaluationStatus.startsWith("not_evaluated") && (
                      <p className="text-[10px] text-amber-600 italic">{best.score.hydraulicEvaluationStatus}</p>
                    )}
                  </div>
                ) : layout.waterSource && layout.pump ? (
                  <div className="border-t border-amber-200 pt-2">
                    <button
                      onClick={runHydraulicValidation}
                      className="w-full px-3 py-1.5 border border-amber-300 hover:border-amber-500 text-amber-700 hover:text-amber-900 rounded-sm text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Validar hidráulica dos melhores candidatos
                    </button>
                    <p className="text-[9px] text-amber-500 mt-1 leading-tight">
                      Usa o mesmo solver do projeto final. Apenas Top {OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES} candidatos avaliados.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-600 italic border-t border-amber-200 pt-2">
                    Defina captação e bomba para validar hidráulica dos melhores candidatos.
                  </p>
                )}

                {best.score.sectionValveCount !== null ? (
                  <div className="border-t border-amber-200 pt-2 space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">
                      Métricas operacionais — preliminares
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-ink-2">
                      <span><span className="text-ink-4 font-sans">Reg. seção</span> {best.score.sectionValveCount}</span>
                      {best.score.operationalSegmentsCount !== null && (
                        <span><span className="text-ink-4 font-sans">Segmentos</span> {best.score.operationalSegmentsCount}</span>
                      )}
                      {best.score.fragmentedColumnCount !== null && (
                        <span><span className="text-ink-4 font-sans">Col. frag.</span> {best.score.fragmentedColumnCount}</span>
                      )}
                      {best.score.fragmentedLateralRatio !== null && (
                        <span><span className="text-ink-4 font-sans">Frag.</span> {(best.score.fragmentedLateralRatio * 100).toFixed(0)}%</span>
                      )}
                      {best.score.desbalanceamentoPercent !== null && (
                        <span><span className="text-ink-4 font-sans">Desbal.</span> {best.score.desbalanceamentoPercent.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-600 italic">
                    Selecione uma jornada para incluir métricas operacionais.
                  </p>
                )}

                <details className="text-[10px]">
                  <summary className="cursor-pointer text-amber-700 hover:text-amber-900 select-none">
                    Justificativa do motor
                  </summary>
                  <p className="mt-1.5 text-ink-3 leading-relaxed">{selectionReason}</p>
                </details>

                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={applyOptimizerCandidate}
                    className="flex-1 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-sm text-xs font-medium transition-colors"
                  >
                    Aplicar candidato
                  </button>
                  <button
                    onClick={dismissOptimizer}
                    className="px-3 py-1.5 border border-border hover:border-border-strong text-ink-2 hover:text-ink rounded-sm text-xs font-medium transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            );
          })()}
          {/* ────────────────────────────────────────────────────────────── */}
        </div>

        {layout.sprinklers && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-4">
              Setorização
            </h3>

            <div className="mb-3">
              <span className="text-[11px] uppercase tracking-[0.1em] text-ink-3 block mb-2">
                Jornada operacional
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([9, 14, 21] as Jornada[]).map((h) => {
                  const active = layout.sectorization?.jornadaHoras === h;
                  return (
                    <button
                      key={h}
                      onClick={() => applyJornada(h)}
                      className={clsx(
                        "px-3 py-2 rounded-sm text-sm font-medium border transition-colors",
                        active
                          ? "bg-ink text-white border-ink"
                          : "bg-background text-ink-2 border-border hover:border-border-strong"
                      )}
                    >
                      {h} h
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TASK-060: lâmina desejada e cultura como inputs do projetista */}
            {layout.sectorization && (
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <label className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  Lâmina (mm/dia)
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    value={layout.sectorization.laminaMm}
                    onChange={(e) => applyLamina(parseFloat(e.target.value))}
                    className="mt-1 w-full px-2 py-1.5 rounded-sm border border-border bg-background text-sm text-ink font-mono normal-case tracking-normal focus:outline-none focus:border-border-strong"
                  />
                </label>
                <label className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  Cultura
                  <input
                    type="text"
                    value={layout.sectorization.cultura ?? ""}
                    onChange={(e) => applyCultura(e.target.value)}
                    placeholder="ex.: pastagem"
                    className="mt-1 w-full px-2 py-1.5 rounded-sm border border-border bg-background text-sm text-ink normal-case tracking-normal focus:outline-none focus:border-border-strong"
                  />
                </label>
              </div>
            )}

            {layout.sectorization && (
              <div className="space-y-2">
                <div className="bg-background border border-border rounded-sm p-3">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                    <Row
                      label="Lâmina bruta"
                      value={`${layout.sectorization.laminaMm} mm/dia`}
                      mono
                    />
                    <Row
                      label="Tempo/setor"
                      value={`${layout.sectorization.tempoPorSetorMinutos} min`}
                      mono
                    />
                    <Row
                      label="Setores"
                      value={String(layout.sectorization.setoresCount)}
                    />
                    <Row
                      label="Aspersores/setor"
                      value={String(layout.sectorization.aspersoresPorSetor)}
                    />
                    <Row
                      label="Vazão/setor"
                      value={`${layout.sectorization.vazaoPorSetorM3PorHora.toFixed(1)} m³/h`}
                      mono
                      span={2}
                    />
                    {/* TASK-060: leitura agronômica (diagnóstico-only, TASK-059) */}
                    {projectResult.agronomy && (
                      <>
                        <Row
                          label="Intensidade"
                          value={`${projectResult.agronomy.intensidadeAplicacaoMmH.toFixed(1)} mm/h`}
                          mono
                        />
                        <Row
                          label="Setores (agronômico)"
                          value={String(projectResult.agronomy.setoresRecomendados)}
                        />
                      </>
                    )}
                  </div>
                </div>

                {selectedSectorData && (
                  <div className="bg-ink text-white rounded-sm p-3 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Setor {selectedSectorData.number}{" "}
                        <span className="text-white/50 font-normal">
                          de {selectedSectorData.total}
                        </span>
                      </span>
                      <button
                        onClick={() => setSelectedSector(null)}
                        className="text-[11px] text-white/60 hover:text-white uppercase tracking-wider"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/50 mb-0.5">
                          Aspersores
                        </div>
                        <div className="font-medium">
                          {selectedSectorData.count}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/50 mb-0.5">
                          Vazão
                        </div>
                        <div className="font-mono">
                          {selectedSectorData.vazao.toFixed(1)} m³/h
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-white/15">
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/50 mb-0.5">
                          Tempo de operação
                        </div>
                        <div className="font-mono">
                          {selectedSectorData.tempo} min · operação{" "}
                          {selectedSectorData.number} de{" "}
                          {selectedSectorData.total}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={clearSectorization}
                  className="w-full px-3 py-1.5 text-[11px] text-ink-4 hover:text-danger rounded-sm uppercase tracking-wider"
                >
                  Limpar setorização
                </button>
              </div>
            )}

            {!layout.sectorization && (
              <div className="text-xs text-ink-4 italic px-1">
                Escolha uma jornada para dividir os aspersores em setores.
              </div>
            )}
          </div>
        )}
{bom && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em]">
                Lista de materiais
              </h3>
              <span className="text-[10px] font-mono text-ink-4">
                Ø {bom.meta.diametroPrincipalMm}mm ·{" "}
                {bom.meta.diametroPrincipalCalculadoMm.toFixed(0)}mm calc
              </span>
            </div>

            <div className="bg-background border border-border rounded-sm overflow-hidden">
              {(["ASPERSOR", "TUBO", "CONEXAO", "ACESSORIO"] as const).map((cat) => {
                const grupo = bom.itens.filter((it) => it.categoria === cat);
                if (grupo.length === 0) return null;
                const subtotal = grupo.reduce((s, it) => s + it.total, 0);
                const nomesCat: Record<string, string> = {
                  ASPERSOR: "Aspersores",
                  TUBO: "Tubos",
                  CONEXAO: "Conexões",
                  ACESSORIO: "Acessórios",
                };
                return (
                  <div key={cat} className="border-b border-border last:border-b-0">
                    <div className="px-3 py-1.5 bg-surface flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-[0.1em]">
                        {nomesCat[cat]}
                      </span>
                      <span className="text-[10px] font-mono text-ink-3">
                        R${" "}
                        {subtotal.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {grupo.map((item, i) => (
                      <div
                        key={`${item.sku}-${i}`}
                        className={clsx(
                          "px-3 py-2.5 text-xs",
                          i > 0 && "border-t border-border"
                        )}
                      >
                        <div className="flex-1 min-w-0 mb-1">
                          <div className="font-medium text-ink truncate">
                            {item.descricao}
                          </div>
                          <div className="text-[10px] font-mono text-ink-4 mt-0.5">
                            SKU {item.sku}
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between font-mono text-[11px]">
                          <span className="text-ink-3">
                            {item.quantidade} {item.unidade} ×{" "}
                            R$ {item.precoUnitario.toFixed(2)}
                          </span>
                          <span className="text-ink font-medium">
                            R${" "}
                            {item.total.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div className="px-3 py-3 bg-ink text-white flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold">
                  Total
                </span>
                <span className="font-mono text-base font-semibold">
                  R${" "}
                  {bom.totalGeral.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="mt-3 text-[10px] text-ink-4 italic leading-relaxed">
              Valores estimados conforme catálogo Brasmáquinas. Bomba, filtros e instalação não inclusos nesta fase.
            </div>
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-3">
            Como usar
          </h4>
          <ol className="space-y-2 text-xs text-ink-2 leading-relaxed">
            <li>
              <span className="font-mono text-ink-3">1.</span> Desenhe a{" "}
              <strong>área irrigada</strong>.
            </li>
            <li>
              <span className="font-mono text-ink-3">2.</span> Marque a{" "}
              <strong>captação</strong>.
            </li>
            <li>
              <span className="font-mono text-ink-3">3.</span> Trace a{" "}
              <strong>tubulação principal</strong>.
            </li>
            <li>
              <span className="font-mono text-ink-3">4.</span> Posicione a{" "}
              <strong>grade</strong> e escolha a <strong>jornada</strong>.
            </li>
            <li>
              <span className="font-mono text-ink-3">5.</span> Clique num
              setor no mapa para ver detalhes.
            </li>
          </ol>
        </div>
      </aside>
    </div>
  );
}

function LegendRow({
  color,
  label,
  dashed,
  dot,
  thin,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  dot?: boolean;
  /** Linha fina (lateral física — backbone) vs. linha normal (trecho operacional). */
  thin?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot ? (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white shadow-sm"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          className={`flex-shrink-0 w-5 rounded-full ${thin ? "h-px" : "h-0.5"}`}
          style={
            dashed
              ? {
                  backgroundImage: `repeating-linear-gradient(to right, ${color} 0, ${color} 3px, transparent 3px, transparent 5px)`,
                  backgroundColor: "transparent",
                }
              : { backgroundColor: color, opacity: thin ? 0.5 : 1 }
          }
        />
      )}
      <span className="text-[9px] text-ink-2 whitespace-nowrap">{label}</span>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  span,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2 pt-2 border-t border-border" : ""}>
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-0.5">
        {label}
      </div>
      <div
        className={clsx(
          "text-ink",
          mono ? "font-mono text-xs" : "text-sm font-medium"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  disabled,
  tooltip,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip ?? label}
      className={clsx(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors",
        disabled
          ? "text-ink-4 cursor-not-allowed"
          : active
            ? "bg-ink text-white"
            : "text-ink-2 hover:bg-surface"
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function MarkerPin({
  children,
  highlighted,
  compound,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  compound?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      {highlighted && (
        <div className="absolute -inset-1 rounded-full bg-brand/30 animate-pulse" />
      )}
      <div
        className={clsx(
          "relative w-9 h-9 rounded-full bg-ink shadow-lg flex items-center justify-center ring-2 transition-all",
          highlighted ? "ring-brand" : "ring-white"
        )}
      >
        {children}
        {compound && (
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white ring-2 ring-ink flex items-center justify-center"
            title="Captação e bomba unificadas"
          >
            <Wrench className="w-2.5 h-2.5 text-ink" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="w-0.5 h-2 bg-ink -mt-px" />
    </div>
  );
}

function SaveStatus({
  saving,
  savedAt,
}: {
  saving: boolean;
  savedAt: Date | null;
}) {
  return (
    <div className="absolute top-4 right-4 text-[11px] font-mono text-ink-3 bg-white/90 backdrop-blur-md border border-border rounded-sm px-2.5 py-1 flex items-center gap-1.5">
      {saving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Salvando…</span>
        </>
      ) : savedAt ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span>
            Salvo ·{" "}
            {savedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </>
      ) : (
        <span>—</span>
      )}
    </div>
  );
}

function SidebarItem({
  label,
  value,
  active,
  mono,
  onRemove,
  extra,
}: {
  label: string;
  value: string;
  active: boolean;
  mono?: boolean;
  onRemove?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.1em]">
          {label}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-[11px] text-ink-4 hover:text-danger uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remover
          </button>
        )}
      </div>
      <div
        className={clsx(
          "text-sm",
          mono && "font-mono text-xs",
          active ? "text-ink" : "text-ink-4 italic"
        )}
      >
        {value}
      </div>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function ApplyCityButton({
  projectId,
  city,
  state,
}: {
  projectId: string;
  city?: string;
  state?: string;
}) {
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const apply = async () => {
    setApplying(true);
    const { applyDetectedCity } = await import(
      "@/app/projetos/[id]/actions"
    );
    await applyDetectedCity(projectId, { city, state });
    setApplied(true);
    setApplying(false);
    setTimeout(() => window.location.reload(), 400);
  };

  if (applied) {
    return (
      <span className="text-[11px] text-success uppercase tracking-wider">
        Aplicado ✓
      </span>
    );
  }

  return (
    <button
      onClick={apply}
      disabled={applying}
      className="text-[11px] text-ink-3 hover:text-ink uppercase tracking-wider disabled:opacity-50"
    >
      {applying ? "Aplicando…" : "Aplicar ao projeto"}
    </button>
  );
}