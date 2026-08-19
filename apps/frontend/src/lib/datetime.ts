export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function formatDuration(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatDateForDisplay(date: string, time?: string): string {
  try {
    const d = new Date(`${date}T${time ?? '00:00'}`);
    const formatted = d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    const capitalized = formatted
      .replace(/\./g, '')
      .replace(/^./, (c) => c.toUpperCase());
    if (time) return `${capitalized} · ${time}`;
    return capitalized;
  } catch {
    return date;
  }
}

export function formatEventDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const formatted = d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    return formatted.replace(/\./g, '').replace(/^./, (c) => c.toUpperCase());
  } catch {
    return isoDate;
  }
}

export function getYear(isoDate: string): number {
  return new Date(isoDate).getFullYear();
}
