import { Check, Client, CashIncome } from '../types';
import { getTodayDateString } from './dateUtils';

/**
 * Normaliza cadenas quitando tildes y espacios extras para comparaciones seguras.
 */
export const normalizeClientKey = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

/**
 * Normaliza y canonicaliza nombres de clientes conocidos o con errores tipográficos comunes:
 * 1. "andrea Dias" / "Andrea diaz" -> "Andrea diaz"
 * 2. "lola ponton" / "MAGDALENA PONTON" -> "MAGDALENA PONTON"
 */
export const canonicalizeClientName = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const key = normalizeClientKey(trimmed);

  // Regla 1: Andrea diaz / andrea Dias
  if (key === 'andrea dias' || key === 'andrea diaz') {
    return 'Andrea diaz';
  }

  // Regla 2: Lola ponton y MAGDALENA PONTON son el mismo cliente
  if (key === 'lola ponton' || key === 'magdalena ponton') {
    return 'MAGDALENA PONTON';
  }

  return trimmed;
};

/**
 * Verifica si un nombre corresponde a la variante "andrea dias"
 */
export const isAndreaDiasVariant = (name: string): boolean => {
  if (!name) return false;
  return normalizeClientKey(name) === 'andrea dias';
};

/**
 * Verifica si un nombre corresponde a la variante "lola ponton"
 */
export const isLolaPontonVariant = (name: string): boolean => {
  if (!name) return false;
  return normalizeClientKey(name) === 'lola ponton';
};

export interface UnifyResult {
  updatedChecks: Check[];
  updatedCashIncomes: CashIncome[];
  updatedClients: Client[];
  affectedChecksCount: number;
  affectedIncomesCount: number;
  wasMerged: boolean;
}

/**
 * Pasa todos los cheques, ingresos en efectivo y datos de un cliente origen al cliente destino.
 * Consolida teléfonos, cédula/RUC y notas de contacto.
 */
export const unifyClientRecords = (
  checks: Check[],
  cashIncomes: CashIncome[],
  clients: Client[],
  sourceName: string,
  targetName: string
): UnifyResult => {
  const srcKey = normalizeClientKey(sourceName);
  const tgtCanonical = canonicalizeClientName(targetName);
  const tgtKey = normalizeClientKey(tgtCanonical);

  if (!srcKey || !tgtCanonical || srcKey === tgtKey) {
    return {
      updatedChecks: checks,
      updatedCashIncomes: cashIncomes,
      updatedClients: clients,
      affectedChecksCount: 0,
      affectedIncomesCount: 0,
      wasMerged: false,
    };
  }

  let affectedChecksCount = 0;
  let affectedIncomesCount = 0;

  // 1. Actualizar cheques
  const updatedChecks = checks.map((chk) => {
    if (normalizeClientKey(chk.clientName) === srcKey) {
      affectedChecksCount++;
      return {
        ...chk,
        clientName: tgtCanonical,
        updatedAt: new Date().toISOString(),
      };
    }
    return chk;
  });

  // 2. Actualizar ingresos en efectivo
  const updatedCashIncomes = cashIncomes.map((inc) => {
    if (normalizeClientKey(inc.clientName) === srcKey) {
      affectedIncomesCount++;
      return {
        ...inc,
        clientName: tgtCanonical,
      };
    }
    return inc;
  });

  // 3. Fusionar ficha de cliente
  const sourceClients = clients.filter((c) => normalizeClientKey(c.name) === srcKey);
  const targetClient = clients.find((c) => normalizeClientKey(c.name) === tgtKey);

  // Rescatar teléfono, cédula y notas del origen si el destino no los tiene
  const sourcePhone = sourceClients.find((c) => c.phone)?.phone;
  const sourceId = sourceClients.find((c) => c.identification)?.identification;
  const sourceNotes = sourceClients
    .map((c) => c.notes)
    .filter(Boolean)
    .join(' | ');

  let updatedClients = clients.filter((c) => normalizeClientKey(c.name) !== srcKey);

  if (targetClient) {
    updatedClients = updatedClients.map((c) => {
      if (normalizeClientKey(c.name) === tgtKey) {
        const combinedNotes = [c.notes, sourceNotes ? `(Datos transferidos de ${sourceName}: ${sourceNotes})` : '']
          .filter(Boolean)
          .join(' · ');

        return {
          ...c,
          name: tgtCanonical,
          phone: c.phone || sourcePhone,
          identification: c.identification || sourceId,
          notes: combinedNotes || undefined,
        };
      }
      return c;
    });
  } else {
    // Si el cliente destino no existía en el catálogo, lo creamos con los datos del origen
    const newTargetClient: Client = {
      id: sourceClients[0]?.id || `cli-${Date.now()}`,
      name: tgtCanonical,
      phone: sourcePhone,
      identification: sourceId,
      notes: sourceNotes ? `Cliente unificado desde ${sourceName}: ${sourceNotes}` : undefined,
      createdAt: sourceClients[0]?.createdAt || getTodayDateString(),
    };
    updatedClients = [newTargetClient, ...updatedClients];
  }

  return {
    updatedChecks,
    updatedCashIncomes,
    updatedClients,
    affectedChecksCount,
    affectedIncomesCount,
    wasMerged: true,
  };
};

/**
 * Auto-unificación de todos los alias conocidos solicitados por el usuario:
 * 1. "andrea Dias" -> "Andrea diaz"
 * 2. "lola ponton" -> "MAGDALENA PONTON"
 */
export const autoUnifyKnownAliases = (
  checks: Check[],
  cashIncomes: CashIncome[],
  clients: Client[]
): UnifyResult => {
  let curChecks = checks;
  let curIncomes = cashIncomes;
  let curClients = clients;
  let totalAffectedChecks = 0;
  let totalAffectedIncomes = 0;
  let anyMerged = false;

  // 1. Unificar Lola Ponton -> MAGDALENA PONTON
  const hasLolaChecks = curChecks.some((c) => isLolaPontonVariant(c.clientName));
  const hasLolaIncomes = curIncomes.some((i) => isLolaPontonVariant(i.clientName));
  const hasLolaClients = curClients.some((c) => isLolaPontonVariant(c.name));

  if (hasLolaChecks || hasLolaIncomes || hasLolaClients) {
    const resLola = unifyClientRecords(curChecks, curIncomes, curClients, 'lola ponton', 'MAGDALENA PONTON');
    if (resLola.wasMerged) {
      curChecks = resLola.updatedChecks;
      curIncomes = resLola.updatedCashIncomes;
      curClients = resLola.updatedClients;
      totalAffectedChecks += resLola.affectedChecksCount;
      totalAffectedIncomes += resLola.affectedIncomesCount;
      anyMerged = true;
    }
  }

  // 2. Unificar Andrea Dias -> Andrea diaz
  const hasAndreaChecks = curChecks.some((c) => isAndreaDiasVariant(c.clientName));
  const hasAndreaIncomes = curIncomes.some((i) => isAndreaDiasVariant(i.clientName));
  const hasAndreaClients = curClients.some((c) => isAndreaDiasVariant(c.name));

  if (hasAndreaChecks || hasAndreaIncomes || hasAndreaClients) {
    const resAndrea = unifyClientRecords(curChecks, curIncomes, curClients, 'andrea Dias', 'Andrea diaz');
    if (resAndrea.wasMerged) {
      curChecks = resAndrea.updatedChecks;
      curIncomes = resAndrea.updatedCashIncomes;
      curClients = resAndrea.updatedClients;
      totalAffectedChecks += resAndrea.affectedChecksCount;
      totalAffectedIncomes += resAndrea.affectedIncomesCount;
      anyMerged = true;
    }
  }

  return {
    updatedChecks: curChecks,
    updatedCashIncomes: curIncomes,
    updatedClients: curClients,
    affectedChecksCount: totalAffectedChecks,
    affectedIncomesCount: totalAffectedIncomes,
    wasMerged: anyMerged,
  };
};

/**
 * Compatibilidad con autoUnifyAndreaDias llamando a autoUnifyKnownAliases
 */
export const autoUnifyAndreaDias = (
  checks: Check[],
  cashIncomes: CashIncome[],
  clients: Client[]
): UnifyResult => {
  return autoUnifyKnownAliases(checks, cashIncomes, clients);
};
