export interface SectorSummary {
    name: string;
    address?: string;
    count: number;
    first: string;
    last: string;
    latitude?: number;
    longitude?: number;
}

/** Texto de ubicación de una lectura: lugar configurado, dirección y coordenadas exactas */
export function describeLocation(s: any): string {
    const coords = s.latitude != null && s.longitude != null
        ? `${Number(s.latitude).toFixed(6)}, ${Number(s.longitude).toFixed(6)}` : '';
    return [s.locationName, s.address, coords].filter(Boolean).join(' · ') || 'Sin ubicación';
}

/**
 * Agrupa las lecturas de una placa por sector:
 *  - Cámaras fijas: por el nombre del lugar.
 *  - App móvil: por cuadras (~110 m), nombradas con la dirección de la lectura más reciente.
 */
export function summarizeSectors(sightings: any[]): SectorSummary[] {
    const sectors = new Map<string, SectorSummary>();
    for (const s of sightings) {
        const hasGps = s.latitude != null && s.longitude != null;
        const key = s.locationName
            || (hasGps ? `gps:${Number(s.latitude).toFixed(3)},${Number(s.longitude).toFixed(3)}` : 'sin-ubicacion');
        const seenAt = s.seenAt || s.createdAt || '';
        const current = sectors.get(key);
        if (!current) {
            sectors.set(key, {
                name: s.locationName || s.address
                    || (hasGps ? `Cerca de ${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : 'Sin ubicación'),
                address: s.address,
                count: 1, first: seenAt, last: seenAt,
                latitude: hasGps ? s.latitude : undefined,
                longitude: hasGps ? s.longitude : undefined,
            });
            continue;
        }
        current.count++;
        if (seenAt < current.first) current.first = seenAt;
        if (seenAt >= current.last) {
            current.last = seenAt;
            // el sector toma la dirección y posición de la lectura más reciente
            if (s.address) {
                current.address = s.address;
                if (!s.locationName) current.name = s.address;
            }
            if (hasGps) {
                current.latitude = s.latitude;
                current.longitude = s.longitude;
            }
        } else if (current.latitude == null && hasGps) {
            current.latitude = s.latitude;
            current.longitude = s.longitude;
        }
    }
    return [...sectors.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}
