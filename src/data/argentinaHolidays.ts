export type HolidayType = 'inamovible' | 'trasladable' | 'nolaborable' | 'puente';

export interface ArgentinaHoliday {
  fecha: string; // YYYY-MM-DD
  tipo: HolidayType;
  nombre: string;
}

export interface HolidayLoadResult {
  holidays: ArgentinaHoliday[];
  source: 'api' | 'cache' | 'local';
}

const CACHE_PREFIX = 'ar_holidays_v1_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

const STATIC_HOLIDAYS_BY_YEAR: Record<number, ArgentinaHoliday[]> = {
  2025: [
    { fecha: '2025-01-01', tipo: 'inamovible', nombre: 'Año Nuevo' },
    { fecha: '2025-03-03', tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: '2025-03-04', tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: '2025-03-24', tipo: 'inamovible', nombre: 'Día de la Memoria por la Verdad y la Justicia' },
    { fecha: '2025-04-02', tipo: 'inamovible', nombre: 'Día del Veterano y Caídos en Malvinas' },
    { fecha: '2025-04-17', tipo: 'nolaborable', nombre: 'Jueves Santo' },
    { fecha: '2025-04-18', tipo: 'inamovible', nombre: 'Viernes Santo' },
    { fecha: '2025-05-01', tipo: 'inamovible', nombre: 'Día del Trabajador' },
    { fecha: '2025-05-02', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2025-05-25', tipo: 'inamovible', nombre: 'Día de la Revolución de Mayo' },
    { fecha: '2025-06-16', tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. Güemes' },
    { fecha: '2025-06-20', tipo: 'inamovible', nombre: 'Paso a la Inmortalidad del Gral. Belgrano' },
    { fecha: '2025-07-09', tipo: 'inamovible', nombre: 'Día de la Independencia' },
    { fecha: '2025-08-15', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2025-08-17', tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. San Martín' },
    { fecha: '2025-10-10', tipo: 'trasladable', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: '2025-11-21', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2025-11-24', tipo: 'trasladable', nombre: 'Día de la Soberanía Nacional' },
    { fecha: '2025-12-08', tipo: 'inamovible', nombre: 'Inmaculada Concepción de María' },
    { fecha: '2025-12-25', tipo: 'inamovible', nombre: 'Navidad' },
  ],
  2026: [
    { fecha: '2026-01-01', tipo: 'inamovible', nombre: 'Año Nuevo' },
    { fecha: '2026-02-16', tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: '2026-02-17', tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: '2026-03-23', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2026-03-24', tipo: 'inamovible', nombre: 'Día de la Memoria por la Verdad y la Justicia' },
    { fecha: '2026-04-02', tipo: 'inamovible', nombre: 'Malvinas / Jueves Santo' },
    { fecha: '2026-04-03', tipo: 'inamovible', nombre: 'Viernes Santo' },
    { fecha: '2026-05-01', tipo: 'inamovible', nombre: 'Día del Trabajador' },
    { fecha: '2026-05-25', tipo: 'inamovible', nombre: 'Día de la Revolución de Mayo' },
    { fecha: '2026-06-15', tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. Güemes' },
    { fecha: '2026-06-20', tipo: 'inamovible', nombre: 'Paso a la Inmortalidad del Gral. Belgrano' },
    { fecha: '2026-07-09', tipo: 'inamovible', nombre: 'Día de la Independencia' },
    { fecha: '2026-07-10', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2026-08-17', tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. San Martín' },
    { fecha: '2026-10-12', tipo: 'trasladable', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: '2026-11-23', tipo: 'trasladable', nombre: 'Día de la Soberanía Nacional' },
    { fecha: '2026-12-07', tipo: 'nolaborable', nombre: 'Día no laborable turístico' },
    { fecha: '2026-12-08', tipo: 'inamovible', nombre: 'Inmaculada Concepción de María' },
    { fecha: '2026-12-25', tipo: 'inamovible', nombre: 'Navidad' },
  ],
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return next;
}

/** Algoritmo de Meeus/Jones/Butcher para Domingo de Pascua gregoriano */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Regla Ley 27.399 para feriados trasladables: mar/mié -> lun anterior; jue/vie -> lun siguiente */
function applyLey27399Shift(year: number, monthIndex: number, day: number): Date {
  const date = new Date(year, monthIndex, day);
  const dow = date.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  if (dow === 2) return addDays(date, -1);
  if (dow === 3) return addDays(date, -2);
  if (dow === 4) return addDays(date, 4);
  if (dow === 5) return addDays(date, 3);
  return date;
}

function generateFallbackHolidays(year: number): ArgentinaHoliday[] {
  if (STATIC_HOLIDAYS_BY_YEAR[year]) {
    return STATIC_HOLIDAYS_BY_YEAR[year];
  }

  const easter = getEasterSunday(year);
  const carnivalMonday = addDays(easter, -48);
  const carnivalTuesday = addDays(easter, -47);
  const maundyThursday = addDays(easter, -3);
  const goodFriday = addDays(easter, -2);

  const guemes = applyLey27399Shift(year, 5, 17);
  const sanMartin = applyLey27399Shift(year, 7, 17);
  const diversidad = applyLey27399Shift(year, 9, 12);
  const soberania = applyLey27399Shift(year, 10, 20);

  const list: ArgentinaHoliday[] = [
    { fecha: `${year}-01-01`, tipo: 'inamovible', nombre: 'Año Nuevo' },
    { fecha: toIsoDate(carnivalMonday), tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: toIsoDate(carnivalTuesday), tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: `${year}-03-24`, tipo: 'inamovible', nombre: 'Día de la Memoria por la Verdad y la Justicia' },
    { fecha: `${year}-04-02`, tipo: 'inamovible', nombre: 'Día del Veterano y Caídos en Malvinas' },
    { fecha: toIsoDate(maundyThursday), tipo: 'nolaborable', nombre: 'Jueves Santo' },
    { fecha: toIsoDate(goodFriday), tipo: 'inamovible', nombre: 'Viernes Santo' },
    { fecha: `${year}-05-01`, tipo: 'inamovible', nombre: 'Día del Trabajador' },
    { fecha: `${year}-05-25`, tipo: 'inamovible', nombre: 'Día de la Revolución de Mayo' },
    { fecha: toIsoDate(guemes), tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. Güemes' },
    { fecha: `${year}-06-20`, tipo: 'inamovible', nombre: 'Paso a la Inmortalidad del Gral. Belgrano' },
    { fecha: `${year}-07-09`, tipo: 'inamovible', nombre: 'Día de la Independencia' },
    { fecha: toIsoDate(sanMartin), tipo: 'trasladable', nombre: 'Paso a la Inmortalidad del Gral. San Martín' },
    { fecha: toIsoDate(diversidad), tipo: 'trasladable', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: toIsoDate(soberania), tipo: 'trasladable', nombre: 'Día de la Soberanía Nacional' },
    { fecha: `${year}-12-08`, tipo: 'inamovible', nombre: 'Inmaculada Concepción de María' },
    { fecha: `${year}-12-25`, tipo: 'inamovible', nombre: 'Navidad' },
  ];

  // Unificar si coinciden fechas (ej: Jueves Santo con 2 de abril)
  const merged = new Map<string, ArgentinaHoliday>();
  for (const item of list) {
    const existing = merged.get(item.fecha);
    if (existing) {
      merged.set(item.fecha, {
        fecha: item.fecha,
        tipo: existing.tipo === 'inamovible' || item.tipo === 'inamovible' ? 'inamovible' : existing.tipo,
        nombre: `${existing.nombre} / ${item.nombre}`,
      });
    } else {
      merged.set(item.fecha, item);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function normalizeHolidayType(rawType: string): HolidayType {
  const normalized = rawType.toLowerCase().trim();
  if (normalized === 'inamovible') return 'inamovible';
  if (normalized === 'trasladable') return 'trasladable';
  if (normalized === 'puente') return 'puente';
  return 'nolaborable';
}

export function getInitialHolidays(year: number): HolidayLoadResult {
  try {
    const cachedRaw = localStorage.getItem(`${CACHE_PREFIX}${year}`);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as { timestamp: number; data: ArgentinaHoliday[] };
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        return { holidays: parsed.data, source: 'cache' };
      }
    }
  } catch {
    // Ignore storage errors
  }

  return { holidays: generateFallbackHolidays(year), source: 'local' };
}

export async function fetchOfficialHolidays(year: number, signal?: AbortSignal): Promise<HolidayLoadResult> {
  // Verificar si el caché está fresco
  try {
    const cachedRaw = localStorage.getItem(`${CACHE_PREFIX}${year}`);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as { timestamp: number; data: ArgentinaHoliday[] };
      if (
        Array.isArray(parsed.data) &&
        parsed.data.length > 0 &&
        Date.now() - parsed.timestamp < CACHE_TTL_MS
      ) {
        return { holidays: parsed.data, source: 'cache' };
      }
    }
  } catch {
    // Ignore storage errors
  }

  try {
    const response = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {
      signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const rawList = (await response.json()) as Array<{
      fecha?: string;
      tipo?: string;
      nombre?: string;
    }>;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new Error('Empty holiday list');
    }

    const merged = new Map<string, ArgentinaHoliday>();
    for (const item of rawList) {
      if (!item.fecha || !item.nombre) continue;
      const tipo = normalizeHolidayType(item.tipo ?? 'inamovible');
      const existing = merged.get(item.fecha);
      if (existing) {
        merged.set(item.fecha, {
          fecha: item.fecha,
          tipo: existing.tipo === 'inamovible' || tipo === 'inamovible' ? 'inamovible' : existing.tipo,
          nombre: existing.nombre.includes(item.nombre)
            ? existing.nombre
            : `${existing.nombre} / ${item.nombre}`,
        });
      } else {
        merged.set(item.fecha, {
          fecha: item.fecha,
          tipo,
          nombre: item.nombre,
        });
      }
    }

    const normalized = Array.from(merged.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${year}`,
        JSON.stringify({ timestamp: Date.now(), data: normalized })
      );
    } catch {
      // Ignore storage quota errors
    }

    return { holidays: normalized, source: 'api' };
  } catch {
    return getInitialHolidays(year);
  }
}

export function getHolidayTypeLabel(tipo: HolidayType): string {
  switch (tipo) {
    case 'inamovible':
      return 'Feriado nacional';
    case 'trasladable':
      return 'Feriado trasladable';
    case 'puente':
      return 'Feriado puente';
    case 'nolaborable':
      return 'Día no laborable';
  }
}
