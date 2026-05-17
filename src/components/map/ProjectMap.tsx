"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
} from "lucide-react";
import clsx from "clsx";
import {
  saveProjectLayout,
  type ProjectLayout,
} from "@/app/projetos/[id]/actions";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";

interface Props {
  projectId: string;
  initialLayout?: ProjectLayout;
}

type Mode = "view" | "polygon" | "water" | "pump";

const DEFAULT_CENTER = { longitude: -45.0, latitude: -12.0, zoom: 14 };
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

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

function generateSprinklerGrid(
  polygon: GeoJSON.Polygon,
  spacingMeters: number
): [number, number][] {
  const polyFeature = turf.polygon(polygon.coordinates);
  const bbox = turf.bbox(polyFeature);
  const grid = turf.pointGrid(bbox, spacingMeters / 1000, {
    units: "kilometers",
  });
  const inside = turf.pointsWithinPolygon(grid, polyFeature);
  return inside.features.map(
    (f) => f.geometry.coordinates as [number, number]
  );
}

export function ProjectMap({ projectId, initialLayout }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [layout, setLayout] = useState<ProjectLayout>(initialLayout ?? {});
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const hasMounted = useRef(false);

  const isDrawingPolygon = mode === "polygon";
  const hasPolygonInProgress = isDrawingPolygon && drawingCoords.length > 0;

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

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;

      if (mode === "polygon") {
        setDrawingCoords((prev) => [...prev, [lng, lat]]);
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
        sprinklers: undefined, // limpa aspersores antigos se polígono mudou
      };
    });
    setDrawingCoords([]);
    setMode("view");
  }, [drawingCoords, queryElevation]);

  const cancelPolygon = useCallback(() => {
    setDrawingCoords([]);
    setMode("view");
  }, []);

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
      return next;
    });
  }, []);

  const removeWater = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.waterSource;
      delete next.geodetic;
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
    if (!layout.area) return;
    const positions = generateSprinklerGrid(
      layout.area,
      ASPERSOR_PADRAO.espacamentoPadraoM
    );
    const vazaoProjeto = positions.length * ASPERSOR_PADRAO.vazaoM3PorHora;
    setLayout((l) => ({
      ...l,
      sprinklers: {
        aspersorId: ASPERSOR_PADRAO.id,
        positions,
        count: positions.length,
        vazaoProjetoM3PorHora: vazaoProjeto,
        espacamentoM: ASPERSOR_PADRAO.espacamentoPadraoM,
      },
    }));
  }, [layout.area]);

  const clearSprinklers = useCallback(() => {
    setLayout((l) => {
      const next = { ...l };
      delete next.sprinklers;
      return next;
    });
  }, []);

  const initialCenter = initialLayout?.center
    ? {
        longitude: initialLayout.center.lng,
        latitude: initialLayout.center.lat,
        zoom: initialLayout.center.zoom,
      }
    : DEFAULT_CENTER;

  const sprinklerGeoJSON = layout.sprinklers
    ? {
        type: "FeatureCollection" as const,
        features: layout.sprinklers.positions.map(([lng, lat]) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: [lng, lat] },
        })),
      }
    : null;

  return (
    <div className="grid grid-cols-[1fr_360px] gap-0 h-[calc(100vh-220px)] min-h-[600px] border border-border rounded-md overflow-hidden bg-background">
      <div className="relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialCenter}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onClick={handleMapClick}
          cursor={mode === "view" ? "grab" : "crosshair"}
          terrain={{ source: "mapbox-dem", exaggeration: 1 }}
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
                paint={{ "fill-color": "#094641", "fill-opacity": 0.25 }}
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
              <Marker key={i} longitude={lng} latitude={lat} anchor="center">
                <div className="w-3 h-3 bg-white border-2 border-[#094641] rounded-full shadow-sm" />
              </Marker>
            ))}

          {/* Aspersores via Layer (WebGL — escala) */}
          {sprinklerGeoJSON && (
            <Source id="sprinklers-src" type="geojson" data={sprinklerGeoJSON}>
              <Layer
                id="sprinklers-circles"
                type="circle"
                paint={{
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12,
                    2,
                    16,
                    4,
                    20,
                    6,
                  ],
                  "circle-color": "#0A0A0A",
                  "circle-stroke-color": "#FFFFFF",
                  "circle-stroke-width": 1.2,
                }}
              />
            </Source>
          )}

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
        </Map>

        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-border rounded-md p-1 shadow-lg">
          <ToolButton
            active={mode === "view"}
            onClick={() => {
              setMode("view");
              setDrawingCoords([]);
            }}
            icon={<MousePointer2 className="w-4 h-4" />}
            label="Navegar"
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
        </div>

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

        <SaveStatus saving={saving} savedAt={savedAt} />
      </div>

      <aside className="border-l border-border bg-surface p-6 overflow-y-auto">
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
                ? `${layout.waterSource.lng.toFixed(4)}, ${layout.waterSource.lat.toFixed(4)}`
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

        {/* SEÇÃO ASPERSORES */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-4">
            Aspersores
          </h3>

          <div className="bg-background border border-border rounded-sm p-3 mb-3">
            <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-1">
              Modelo selecionado
            </div>
            <div className="text-sm text-ink font-medium mb-2">
              {ASPERSOR_PADRAO.manufacturer} {ASPERSOR_PADRAO.model}
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
        </div>

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
              <span className="font-mono text-ink-3">3.</span> Clique em{" "}
              <strong>Posicionar grade</strong> para preencher a área com a
              malha de aspersores.
            </li>
          </ol>
        </div>
      </aside>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={clsx(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors",
        active ? "bg-ink text-white" : "text-ink-2 hover:bg-surface"
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