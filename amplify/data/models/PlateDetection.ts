import { a } from "@aws-amplify/backend";

/**
 * Registro de las detecciones de placas buscadas hechas desde la app móvil
 * (operarios) o desde cámaras fijas (ej. parqueaderos).
 * status: 'alerta' | 'en_gestion' | 'capturado' | 'falso_positivo'
 * sourceType: 'movil' | 'fija'
 */
export const PlateDetectionModel = {
    PlateDetection: a.model({
        plate: a.string().required(),
        rawText: a.string(),
        wantedPlateId: a.id(),
        status: a.string(),
        latitude: a.float(),
        longitude: a.float(),
        locationName: a.string(),
        sourceType: a.string(),
        detectedBy: a.string(),
        detectedAt: a.datetime(),
        notes: a.string(),
    })
    .authorization((allow) => [
        allow.groups(['admin']),
        allow.groups(['operario']).to(['create', 'read', 'update']),
        allow.groups(['camara']).to(['create'])
    ])
}
