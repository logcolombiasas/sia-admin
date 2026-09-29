export interface SourceSummary {
  key: string;
  name: string;
  location: string;
  type: string;
  count: number;
  wanted: number;
  last: string;
}

/** Clave de una fuente: la misma cámara puede tener nombre repetido en sedes distintas */
export function sourceKey(s: any): string {
  return `${s.sourceType || 'movil'}|${s.sourceName || '—'}|${s.locationName || ''}`;
}

export function summarizeSources(sightings: any[]): SourceSummary[] {
  const map = new Map<string, SourceSummary>();
  for (const s of sightings) {
    const key = sourceKey(s);
    const current = map.get(key) ?? {
      key, name: s.sourceName || '—', location: s.locationName || '', type: s.sourceType || 'movil',
      count: 0, wanted: 0, last: '',
    };
    current.count++;
    if (s.wanted) current.wanted++;
    if ((s.seenAt || '') > current.last) current.last = s.seenAt;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
