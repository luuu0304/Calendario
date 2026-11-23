export interface WeekdayOption {
  /** Valor de Date.getDay(): 0=Domingo, 1=Lunes ... 6=Sábado */
  dayIndex: number;
  short: string;
  medium: string;
  full: string;
}

export const WEEKDAYS_MON_FIRST: WeekdayOption[] = [
  { dayIndex: 1, short: 'L', medium: 'Lun', full: 'Lunes' },
  { dayIndex: 2, short: 'M', medium: 'Mar', full: 'Martes' },
  { dayIndex: 3, short: 'X', medium: 'Mié', full: 'Miércoles' },
  { dayIndex: 4, short: 'J', medium: 'Jue', full: 'Jueves' },
  { dayIndex: 5, short: 'V', medium: 'Vie', full: 'Viernes' },
  { dayIndex: 6, short: 'S', medium: 'Sáb', full: 'Sábado' },
  { dayIndex: 0, short: 'D', medium: 'Dom', full: 'Domingo' },
];

export const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function formatShortDate(monthIndex: number, day: number): string {
  return `${pad2(day)}/${pad2(monthIndex + 1)}`;
}

export function formatFullDate(year: number, monthIndex: number, day: number): string {
  return `${pad2(day)}/${pad2(monthIndex + 1)}/${year}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export interface CalendarCell {
  day: number | null;
  isoDate: string | null;
  dayOfWeek: number | null;
}

/**
 * Genera la grilla mensual comenzando en Lunes.
 * Las celdas fuera del mes quedan en null para evitar confusiones con fechas de otros meses.
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDayDow = new Date(year, monthIndex, 1).getDay(); // 0=Dom..6=Sáb
  const mondayFirstOffset = (firstDayDow + 6) % 7; // 0=Lun..6=Dom
  const totalDays = getDaysInMonth(year, monthIndex);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < mondayFirstOffset; i++) {
    cells.push({ day: null, isoDate: null, dayOfWeek: null });
  }

  for (let day = 1; day <= totalDays; day++) {
    const dow = new Date(year, monthIndex, day).getDay();
    cells.push({
      day,
      isoDate: formatIsoDate(year, monthIndex, day),
      dayOfWeek: dow,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isoDate: null, dayOfWeek: null });
  }

  return cells;
}

export interface MonthContextBadge {
  label: string;
  tone: 'current' | 'previous' | 'other';
}

export function getMonthContextBadge(
  year: number,
  monthIndex: number,
  today: Date = new Date()
): MonthContextBadge {
  const diffMonths = (year - today.getFullYear()) * 12 + (monthIndex - today.getMonth());
  if (diffMonths === 0) {
    return { label: 'Mes actual', tone: 'current' };
  }
  if (diffMonths === -1) {
    return { label: 'Mes anterior', tone: 'previous' };
  }
  if (diffMonths === 1) {
    return { label: 'Próximo mes', tone: 'other' };
  }
  return { label: diffMonths < 0 ? 'Mes pasado' : 'Mes futuro', tone: 'other' };
}

export function getWeekdayName(dayIndex: number, format: 'medium' | 'full' = 'full'): string {
  const found = WEEKDAYS_MON_FIRST.find((w) => w.dayIndex === dayIndex);
  if (!found) return '';
  return format === 'medium' ? found.medium : found.full;
}
