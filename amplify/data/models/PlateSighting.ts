import { a } from "@aws-amplify/backend";

/**
 * Historial (log) de TODAS las placas leídas por la app móvil y las cámaras fijas,
 * estén o no en el listado. Sirve para saber dónde se ha visto un vehículo antes
 * de que su placa fuera agregada al listado de placas buscadas.
 *
 * Los registros los crea el endpoint `reportSighting` (resolver directo a DynamoDB)
 * y se eliminan automáticamente con el TTL configurado en backend.ts.
 *
 * sourceType: 'movil' (operario con el celular) | 'fija' (cámara fija, ej. parqueadero)
 */
export const PlateSightingModel = {
    PlateSighting: a.model({
        plate: a.string().required(),
        seenAt: a.datetime().required(),
        wanted: a.boolean(),
        wantedPlateId: a.id(),
        latitude: a.float(),
        longitude: a.float(),
        locationName: a.string(),
        sourceType: a.string(),
        sourceName: a.string(),
        rawText: a.string(),
    })
    .secondaryIndexes((index) => [
        index('plate').sortKeys(['seenAt']).name('byPlateAndDate').queryField('listSightingsByPlate')
    ])
    .authorization((allow) => [allow.groups(['admin']).to(['read', 'delete'])]),
}
