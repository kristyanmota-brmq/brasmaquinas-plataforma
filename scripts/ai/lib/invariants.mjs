/**
 * Fonte única das 7 invariantes permanentes do projeto Brasmáquinas.
 * Consumida pelo prompt do GPT Reviewer e pelo validate-structure.mjs.
 *
 * Alteração desta lista exige task documental específica (e idealmente
 * promoção a RB-09+ em docs/metodologia/01-regras-bloqueantes.md).
 */

export const PERMANENT_INVARIANTS = Object.freeze([
  Object.freeze({
    id: "INV-CATALOGO-SEM-HOMOLOGACAO",
    descricao: "Não alterar catálogo sem SKU homologado",
  }),
  Object.freeze({
    id: "INV-NAO-INVENTAR-SKU",
    descricao: "Não inventar SKU",
  }),
  Object.freeze({
    id: "INV-DN100-LATERAL-5022",
    descricao: "Não voltar DN100 como lateral 5022",
  }),
  Object.freeze({
    id: "INV-BLOCKERS-TECNICOS",
    descricao: "Não relaxar blockers técnicos",
  }),
  Object.freeze({
    id: "INV-MASCARAR-PENDENCIA",
    descricao: "Não mascarar pendência",
  }),
  Object.freeze({
    id: "INV-DOMINIO-FORA-UI",
    descricao: "Não colocar lógica de domínio na UI",
  }),
  Object.freeze({
    id: "INV-LAYOUT-INSTAVEL-COMERCIAL",
    descricao: "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis",
  }),
]);

export const INVARIANT_STATUS = Object.freeze({
  OK: "ok",
  VIOLADA: "violada",
  NAO_APLICAVEL: "nao_aplicavel",
});

export const INVARIANT_IDS = Object.freeze(PERMANENT_INVARIANTS.map((inv) => inv.id));

/**
 * Deriva override_permitido a partir do veredito + status das invariantes.
 * Regra: qualquer invariante violada => false (trava terminal).
 * Caso contrário, override só faz sentido se veredito === "reprovado".
 *
 * @param {{ veredito: string, invariantes: Array<{status: string}> }} block
 * @returns {boolean|null}
 */
export function deriveOverridePermitido(block) {
  const algumaViolada = (block.invariantes || []).some(
    (i) => i.status === INVARIANT_STATUS.VIOLADA,
  );
  if (algumaViolada) return false;
  if (block.veredito === "reprovado") return true;
  return null;
}
