export interface SectorSummary {
    name: string;
    count: number;
    first: string;
    last: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Agrupa las lecturas de una placa por sector: el nombre del lugar (cámaras fijas)
 * o, para la app móvil, la ubicación GPS redondeada a ~1 km.
 */
export function summarizeSectors(sightings: any[]): SectorSummary[] {
    const sectors = new Map<string, SectorSummary>();
    for (const s of sightings) {
        const hasGps = s.latitude != null && s.longitude != null;
        const name = s.locationName
            || (hasGps ? `Zona ${Number(s.latitude).toFixed(2)}, ${Number(s.longitude).toFixed(2)}` : 'Sin ubicación');
        const seenAt = s.seenAt || s.createdAt || '';
        const current = sectors.get(name);
        if (!current) {
            sectors.set(name, {
                name, count: 1, first: seenAt, last: seenAt,
                latitude: hasGps ? s.latitude : undefined,
                longitude: hasGps ? s.longitude : undefined,
            });
        } else {
            current.count++;
            if (seenAt < current.first) current.first = seenAt;
            if (seenAt > current.last) current.last = seenAt;
            if (current.latitude == null && hasGps) {
                current.latitude = s.latitude;
                current.longitude = s.longitude;
            }
        }
    }
    return [...sectors.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}
