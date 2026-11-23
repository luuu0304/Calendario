import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ArgentinaHoliday,
  HolidayLoadResult,
  fetchOfficialHolidays,
  getHolidayTypeLabel,
  getInitialHolidays,
} from './data/argentinaHolidays';
import {
  MONTHS_ES,
  WEEKDAYS_MON_FIRST,
  buildMonthGrid,
  formatFullDate,
  formatShortDate,
  getDaysInMonth,
  getMonthContextBadge,
  getWeekdayName,
} from './utils/calendar';

type OverrideAction = 'include' | 'exclude';
type DateFormatMode = 'short' | 'full';

interface SessionDay {
  day: number;
  isoDate: string;
  dayOfWeek: number;
  shortDate: string;
  fullDate: string;
  weekdayShort: string;
  weekdayFull: string;
  holiday?: ArgentinaHoliday;
  manualOverride?: OverrideAction;
}

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, idx) => 2022 + idx);

export default function App() {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`,
    [today]
  );

  const [year, setYear] = useState<number>(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState<number>(today.getMonth());
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [excludeHolidays, setExcludeHolidays] = useState<boolean>(true);
  const [includeNonWorkingAsHoliday, setIncludeNonWorkingAsHoliday] = useState<boolean>(true);
  const [manualOverrides, setManualOverrides] = useState<Record<string, OverrideAction>>({});
  const [dateFormat, setDateFormat] = useState<DateFormatMode>('short');
  const [copyFeedback, setCopyFeedback] = useState<'inline' | 'column' | null>(null);

  const [holidayCache, setHolidayCache] = useState<Record<number, HolidayLoadResult>>(() => ({
    [today.getFullYear()]: getInitialHolidays(today.getFullYear()),
  }));

  useEffect(() => {
    setHolidayCache((prev) => {
      if (prev[year]) return prev;
      return { ...prev, [year]: getInitialHolidays(year) };
    });

    const controller = new AbortController();
    fetchOfficialHolidays(year, controller.signal).then((result) => {
      setHolidayCache((prev) => ({ ...prev, [year]: result }));
    });

    return () => controller.abort();
  }, [year]);

  const yearHolidayData = holidayCache[year] ?? getInitialHolidays(year);

  const holidayMap = useMemo(() => {
    const map = new Map<string, ArgentinaHoliday>();
    for (const h of yearHolidayData.holidays) {
      map.set(h.fecha, h);
    }
    return map;
  }, [yearHolidayData.holidays]);

  const monthHolidays = useMemo(() => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    return yearHolidayData.holidays
      .filter((h) => h.fecha.startsWith(prefix))
      .map((h) => {
        const dayNum = Number(h.fecha.slice(8, 10));
        const dow = new Date(year, monthIndex, dayNum).getDay();
        return {
          ...h,
          dayNum,
          dayOfWeek: dow,
          shortDate: formatShortDate(monthIndex, dayNum),
          weekdayFull: getWeekdayName(dow, 'full'),
          weekdayShort: getWeekdayName(dow, 'medium'),
        };
      });
  }, [year, monthIndex, yearHolidayData.holidays]);

  const cells = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const monthContext = useMemo(
    () => getMonthContextBadge(year, monthIndex, today),
    [year, monthIndex, today]
  );

  const isHolidayBlocking = (holiday?: ArgentinaHoliday): boolean => {
    if (!holiday || !excludeHolidays) return false;
    if (holiday.tipo === 'nolaborable' || holiday.tipo === 'puente') {
      return includeNonWorkingAsHoliday;
    }
    return true;
  };

  const { activeSessions, excludedHolidaySessions, monthOverrideCount } = useMemo(() => {
    const totalDays = getDaysInMonth(year, monthIndex);
    const active: SessionDay[] = [];
    const excludedHolidays: SessionDay[] = [];
    let overrideCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(
        2,
        '0'
      )}`;
      const dow = new Date(year, monthIndex, day).getDay();
      const holiday = holidayMap.get(isoDate);
      const override = manualOverrides[isoDate];
      if (override) overrideCount += 1;

      const isWeekdaySelected = selectedWeekdays.includes(dow);
      const blockedByHoliday = isHolidayBlocking(holiday);
      const autoActive = isWeekdaySelected && !blockedByHoliday;

      const finalActive =
        override === 'include' ? true : override === 'exclude' ? false : autoActive;

      const entry: SessionDay = {
        day,
        isoDate,
        dayOfWeek: dow,
        shortDate: formatShortDate(monthIndex, day),
        fullDate: formatFullDate(year, monthIndex, day),
        weekdayShort: getWeekdayName(dow, 'medium'),
        weekdayFull: getWeekdayName(dow, 'full'),
        holiday,
        manualOverride: override,
      };

      if (finalActive) {
        active.push(entry);
      } else if (isWeekdaySelected && blockedByHoliday && holiday && override !== 'exclude') {
        excludedHolidays.push(entry);
      }
    }

    return {
      activeSessions: active,
      excludedHolidaySessions: excludedHolidays,
      monthOverrideCount: overrideCount,
    };
  }, [
    year,
    monthIndex,
    holidayMap,
    manualOverrides,
    selectedWeekdays,
    excludeHolidays,
    includeNonWorkingAsHoliday,
  ]);

  const toggleWeekday = (dayIndex: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const goToPrevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  const jumpToCurrentMonth = () => {
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
  };

  const jumpToBillingPrevMonth = () => {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    setYear(prev.getFullYear());
    setMonthIndex(prev.getMonth());
  };

  const handleDayClick = (isoDate: string, currentlyActive: boolean, autoActive: boolean) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      if (next[isoDate]) {
        delete next[isoDate];
        return next;
      }
      if (currentlyActive) {
        next[isoDate] = 'exclude';
      } else if (!autoActive) {
        next[isoDate] = 'include';
      }
      return next;
    });
  };

  const clearMonthOverrides = () => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    setManualOverrides((prev) => {
      const next: Record<string, OverrideAction> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(prefix)) next[k] = v;
      }
      return next;
    });
  };

  const copyDates = async (mode: 'inline' | 'column') => {
    if (activeSessions.length === 0) return;
    const values = activeSessions.map((s) => (dateFormat === 'short' ? s.shortDate : s.fullDate));
    const text = mode === 'inline' ? values.join(', ') : values.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(mode);
      window.setTimeout(() => setCopyFeedback(null), 2200);
    } catch {
      // Fallback para navegadores sin permiso clipboard
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyFeedback(mode);
      window.setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  const selectedWeekdayNames = useMemo(() => {
    return WEEKDAYS_MON_FIRST.filter((w) => selectedWeekdays.includes(w.dayIndex)).map(
      (w) => w.full
    );
  }, [selectedWeekdays]);

  const monthLabel = MONTHS_ES[monthIndex];
  const prevBillingDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const isViewingPrevBillingMonth =
    year === prevBillingDate.getFullYear() && monthIndex === prevBillingDate.getMonth();
  const isViewingCurrentMonth =
    year === today.getFullYear() && monthIndex === today.getMonth();

  return (
    <div className="app-shell">
      <header className="top-header no-print">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <CalendarIcon size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="brand-title">Calendario de Sesiones</h1>
            <p className="brand-subtitle">
              Guía mensual para facturación · Feriados oficiales de Argentina
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`quick-jump-btn ${isViewingPrevBillingMonth ? 'is-active' : ''}`}
            onClick={jumpToBillingPrevMonth}
            title="Ir al mes pasado (habitual para facturar a mes vencido)"
          >
            Mes pasado ({MONTHS_ES[prevBillingDate.getMonth()].slice(0, 3)})
          </button>
          <button
            type="button"
            className={`quick-jump-btn ${isViewingCurrentMonth ? 'is-active' : ''}`}
            onClick={jumpToCurrentMonth}
          >
            Mes actual
          </button>
          <button
            type="button"
            className="print-btn"
            onClick={() => window.print()}
            title="Imprimir calendario y fechas del mes"
          >
            <Printer size={17} />
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      <section className="controls-panel no-print" aria-label="Configuración del calendario">
        <div className="control-step month-step">
          <div className="step-header">
            <span className="step-badge">1</span>
            <span className="step-title">Elegí el mes que vas a facturar</span>
            <span className={`context-pill tone-${monthContext.tone}`}>{monthContext.label}</span>
          </div>

          <div className="month-navigator">
            <button
              type="button"
              className="nav-arrow-btn"
              onClick={goToPrevMonth}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="month-select-group">
              <select
                aria-label="Seleccionar mes"
                className="select-input month-select"
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
              >
                {MONTHS_ES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Seleccionar año"
                className="select-input year-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="nav-arrow-btn"
              onClick={goToNextMonth}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        <div className="control-step weekdays-step">
          <div className="step-header">
            <span className="step-badge">2</span>
            <span className="step-title">Días que atiende el paciente</span>
            {selectedWeekdays.length > 0 && (
              <button
                type="button"
                className="clear-days-btn"
                onClick={() => setSelectedWeekdays([])}
              >
                <X size={14} />
                Limpiar
              </button>
            )}
          </div>

          <div className="weekday-pills" role="group" aria-label="Días de la semana">
            {WEEKDAYS_MON_FIRST.map((day) => {
              const active = selectedWeekdays.includes(day.dayIndex);
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  aria-pressed={active}
                  className={`weekday-pill ${active ? 'is-selected' : ''}`}
                  onClick={() => toggleWeekday(day.dayIndex)}
                >
                  <span className="weekday-check" aria-hidden="true">
                    {active ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <span className="weekday-label-full">{day.full}</span>
                  <span className="weekday-label-short">{day.medium}</span>
                </button>
              );
            })}
          </div>

          <div className="holiday-options-row">
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={excludeHolidays}
                onChange={(e) => setExcludeHolidays(e.target.checked)}
              />
              <span>Descontar feriados automáticamente</span>
            </label>

            {excludeHolidays && (
              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={includeNonWorkingAsHoliday}
                  onChange={(e) => setIncludeNonWorkingAsHoliday(e.target.checked)}
                />
                <span>También días no laborables / puente</span>
              </label>
            )}
          </div>
        </div>
      </section>

      <main className="main-grid">
        <section className="calendar-card" aria-label={`Calendario de ${monthLabel} ${year}`}>
          <div className="calendar-card-header">
            <div className="calendar-title-wrap">
              <h2 className="calendar-month-heading">
                {monthLabel} <span className="calendar-year-heading">{year}</span>
              </h2>
              <span className={`context-pill tone-${monthContext.tone}`}>{monthContext.label}</span>
            </div>

            <div className="calendar-legend">
              <span className="legend-item">
                <span className="legend-dot dot-session" /> Día de atención
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-holiday" /> Feriado nacional
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-nolab" /> No laborable / Puente
              </span>
            </div>
          </div>

          <div className="calendar-weekdays-header" aria-hidden="true">
            {WEEKDAYS_MON_FIRST.map((w) => (
              <div
                key={w.dayIndex}
                className={`weekday-col-head ${
                  selectedWeekdays.includes(w.dayIndex) ? 'is-highlighted-col' : ''
                }`}
              >
                <span className="col-head-full">{w.full}</span>
                <span className="col-head-short">{w.medium}</span>
              </div>
            ))}
          </div>

          <div className="calendar-days-grid">
            {cells.map((cell, idx) => {
              if (!cell.day || !cell.isoDate || cell.dayOfWeek === null) {
                return <div key={`empty-${idx}`} className="day-cell is-empty" aria-hidden="true" />;
              }

              const holiday = holidayMap.get(cell.isoDate);
              const isToday = cell.isoDate === todayIso;
              const isSelectedWeekday = selectedWeekdays.includes(cell.dayOfWeek);
              const blockedByHoliday = isHolidayBlocking(holiday);
              const autoActive = isSelectedWeekday && !blockedByHoliday;
              const override = manualOverrides[cell.isoDate];
              const isActive =
                override === 'include' ? true : override === 'exclude' ? false : autoActive;
              const isHolidayExcluded =
                isSelectedWeekday && blockedByHoliday && holiday && override !== 'include';
              const isNonWorking =
                holiday?.tipo === 'nolaborable' || holiday?.tipo === 'puente';

              const cellClasses = [
                'day-cell',
                isToday ? 'is-today' : '',
                isActive ? 'is-session' : '',
                isHolidayExcluded ? 'is-holiday-conflict' : '',
                holiday && !isNonWorking ? 'is-holiday-national' : '',
                holiday && isNonWorking ? 'is-holiday-nolab' : '',
                override === 'exclude' ? 'is-manual-excluded' : '',
                override === 'include' ? 'is-manual-included' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={cell.isoDate}
                  type="button"
                  className={cellClasses}
                  onClick={() => handleDayClick(cell.isoDate!, isActive, autoActive)}
                  title={
                    holiday
                      ? `${cell.day} de ${monthLabel}: ${holiday.nombre} (${getHolidayTypeLabel(
                          holiday.tipo
                        )}). Clic para incluir/excluir.`
                      : `${cell.day} de ${monthLabel}. Clic para incluir/excluir manualmente.`
                  }
                  aria-label={`${getWeekdayName(cell.dayOfWeek)} ${cell.day} de ${monthLabel}${
                    holiday ? `, ${holiday.nombre}` : ''
                  }${isActive ? ', día de sesión' : ''}`}
                >
                  <div className="day-cell-top">
                    <span className="day-number">{cell.day}</span>
                    <div className="day-badges-top">
                      {isToday && <span className="today-tag">Hoy</span>}
                      {isActive && (
                        <span className="session-check-badge" aria-hidden="true">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="day-cell-body">
                    {holiday && (
                      <span
                        className={`holiday-chip ${isNonWorking ? 'chip-nolab' : 'chip-national'}`}
                      >
                        {holiday.nombre}
                      </span>
                    )}

                    {isHolidayExcluded && (
                      <span className="status-tag tag-excluded">Feriado · no se cuenta</span>
                    )}

                    {override === 'exclude' && (
                      <span className="status-tag tag-manual-off">Tachado manual</span>
                    )}

                    {override === 'include' && (
                      <span className="status-tag tag-manual-on">Agregado manual</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="calendar-footer-hint no-print">
            <span>
              Tip: si un paciente faltó un día o recuperó una sesión otro día, hacé clic sobre esa
              fecha para tacharla o agregarla.
            </span>
            {monthOverrideCount > 0 && (
              <button type="button" className="reset-overrides-btn" onClick={clearMonthOverrides}>
                <RotateCcw size={14} />
                Restablecer ajustes ({monthOverrideCount})
              </button>
            )}
          </div>
        </section>

        <aside className="summary-column" aria-label="Resumen para facturación">
          <div className="summary-card">
            <div className="summary-header">
              <div>
                <p className="summary-eyebrow">Planilla de facturación</p>
                <h2 className="summary-title">
                  {monthLabel} {year}
                </h2>
              </div>
              <div className="session-count-box">
                <span className="session-count-num">{activeSessions.length}</span>
                <span className="session-count-label">
                  {activeSessions.length === 1 ? 'sesión' : 'sesiones'}
                </span>
              </div>
            </div>

            {selectedWeekdayNames.length > 0 ? (
              <p className="selected-days-caption">
                Días elegidos: <strong>{selectedWeekdayNames.join(', ')}</strong>
              </p>
            ) : (
              <div className="empty-selection-box">
                <Sparkles size={18} />
                <p>
                  Seleccioná arriba los días que atiende tu paciente (por ejemplo{' '}
                  <strong>Lunes y Miércoles</strong>) para ver exactamente qué fechas facturar.
                </p>
              </div>
            )}

            {excludedHolidaySessions.length > 0 && (
              <div className="conflict-alert" role="status">
                <AlertTriangle size={18} className="conflict-icon" />
                <div>
                  <strong>
                    {excludedHolidaySessions.length === 1
                      ? '1 feriado cae en tus días seleccionados'
                      : `${excludedHolidaySessions.length} feriados caen en tus días seleccionados`}
                  </strong>
                  <ul>
                    {excludedHolidaySessions.map((item) => (
                      <li key={item.isoDate}>
                        {item.weekdayShort} {item.shortDate}: {item.holiday?.nombre} (excluido)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeSessions.length > 0 && (
              <>
                <div className="format-bar no-print">
                  <span className="format-label">Formato de fecha:</span>
                  <div className="format-toggle" role="group" aria-label="Formato de fecha">
                    <button
                      type="button"
                      className={dateFormat === 'short' ? 'is-active' : ''}
                      onClick={() => setDateFormat('short')}
                    >
                      02/11
                    </button>
                    <button
                      type="button"
                      className={dateFormat === 'full' ? 'is-active' : ''}
                      onClick={() => setDateFormat('full')}
                    >
                      02/11/{year}
                    </button>
                  </div>
                </div>

                <ul className="dates-list" aria-label="Fechas de sesiones del mes">
                  {activeSessions.map((session, index) => (
                    <li key={session.isoDate} className="date-list-item">
                      <span className="date-index">{index + 1}.</span>
                      <span className="date-weekday">{session.weekdayShort}</span>
                      <span className="date-value">
                        {dateFormat === 'short' ? session.shortDate : session.fullDate}
                      </span>
                      {session.manualOverride === 'include' && (
                        <span className="date-extra-tag">Extra</span>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="copy-actions no-print">
                  <button
                    type="button"
                    className="copy-primary-btn"
                    onClick={() => copyDates('inline')}
                  >
                    {copyFeedback === 'inline' ? <Check size={17} /> : <Copy size={17} />}
                    <span>
                      {copyFeedback === 'inline'
                        ? '¡Fechas copiadas!'
                        : 'Copiar fechas en línea'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="copy-secondary-btn"
                    onClick={() => copyDates('column')}
                    title="Copia una fecha debajo de la otra para pegar directo en una columna de Excel o Google Sheets"
                  >
                    {copyFeedback === 'column' ? (
                      <Check size={17} />
                    ) : (
                      <FileSpreadsheet size={17} />
                    )}
                    <span>
                      {copyFeedback === 'column'
                        ? '¡Copiado para planilla!'
                        : 'Copiar en columna (Excel)'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="holidays-list-card">
            <h3 className="holidays-card-title">Feriados de {monthLabel} {year}</h3>
            {monthHolidays.length === 0 ? (
              <p className="no-holidays-text">
                Este mes no tiene feriados ni días no laborables nacionales.
              </p>
            ) : (
              <ul className="month-holidays-ul">
                {monthHolidays.map((h) => {
                  const hitsSelectedDay = selectedWeekdays.includes(h.dayOfWeek);
                  const isNonLab = h.tipo === 'nolaborable' || h.tipo === 'puente';
                  return (
                    <li
                      key={h.fecha}
                      className={`month-holiday-item ${hitsSelectedDay ? 'hits-selected' : ''}`}
                    >
                      <div className="holiday-date-pill">
                        <span className="holiday-day-num">{h.shortDate}</span>
                        <span className="holiday-dow">{h.weekdayShort}</span>
                      </div>
                      <div className="holiday-info">
                        <span className="holiday-name">{h.nombre}</span>
                        <span className={`holiday-type-tag ${isNonLab ? 'tag-nolab' : 'tag-nat'}`}>
                          {getHolidayTypeLabel(h.tipo)}
                          {hitsSelectedDay ? ' · Coincide con tu día' : ''}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="holidays-source-note">
              Calendario oficial de Argentina (Ley 27.399 ·{' '}
              {yearHolidayData.source === 'api' || yearHolidayData.source === 'cache'
                ? 'sincronizado con ArgentinaDatos'
                : 'referencia local'}
              ).
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
