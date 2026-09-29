/** Normaliza una placa: mayúsculas y solo letras/números (sin espacios, guiones ni puntos). */
export function normalizePlate(value: any): string {
    return `${value ?? ''}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Formatos estándar en Colombia: carro ABC123, moto ABC12D, moto antigua ABC12 */
const STANDARD_FORMATS = [/^[A-Z]{3}\d{3}$/, /^[A-Z]{3}\d{2}[A-Z]$/, /^[A-Z]{3}\d{2}$/];

export function isStandardPlate(plate: string): boolean {
    return STANDARD_FORMATS.some(r => r.test(plate));
}

/** Acepta cualquier placa alfanumérica de 5 a 7 caracteres (diplomáticas, remolques, etc.) */
export function isValidPlate(plate: string): boolean {
    return /^[A-Z0-9]{5,7}$/.test(plate);
}

/** Muestra la placa con el formato visual colombiano: ABC-123 */
export function formatPlate(plate: string): string {
    const p = normalizePlate(plate);
    return p.length >= 6 ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}
