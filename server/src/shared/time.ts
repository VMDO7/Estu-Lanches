/** Diferença (em minutos) entre o horário local do fuso e o UTC em um instante. */
function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Instante (UTC) correspondente à meia-noite local de `daysAgo` dias atrás no fuso. */
export function startOfLocalDay(timeZone: string, daysAgo = 0, now: Date = new Date()): Date {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "AAAA-MM-DD"

  const midnightAsUtc = new Date(`${localDate}T00:00:00Z`);
  midnightAsUtc.setUTCDate(midnightAsUtc.getUTCDate() - daysAgo);
  const offset = timezoneOffsetMinutes(midnightAsUtc, timeZone);
  return new Date(midnightAsUtc.getTime() - offset * 60_000);
}
