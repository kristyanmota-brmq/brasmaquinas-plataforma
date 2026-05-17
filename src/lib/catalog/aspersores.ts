export interface Aspersor {
  id: string;
  manufacturer: string;
  model: string;
  bocal: string;
  pressaoServicoMca: number;
  vazaoM3PorHora: number;
  raioMolhadoM: number;
  espacamentoPadraoM: number;
}

// Placeholder — confirmar valores com ficha técnica oficial do fabricante.
export const ASPERSORES: Aspersor[] = [
  {
    id: "naan-5022",
    manufacturer: "NaanDanJain",
    model: "5022",
    bocal: "4.0 mm",
    pressaoServicoMca: 25,
    vazaoM3PorHora: 1.5,
    raioMolhadoM: 14,
    espacamentoPadraoM: 12,
  },
];

export const ASPERSOR_PADRAO = ASPERSORES[0];