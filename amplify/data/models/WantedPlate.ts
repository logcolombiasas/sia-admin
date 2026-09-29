import { a } from "@aws-amplify/backend";

/**
 * Listado de placas de vehículos que se deben ubicar/capturar.
 * La placa se guarda normalizada (mayúsculas, sin espacios ni guiones)
 * para que la consulta desde la app móvil sea exacta.
 */
export const WantedPlateModel = {
    WantedPlate: a.model({
        plate: a.string().required(),
        vehicleType: a.string(),
        brand: a.string(),
        line: a.string(),
        color: a.string(),
        modelYear: a.string(),
        owner: a.string(),
        reason: a.string(),
        priority: a.string(),
        notes: a.string(),
        active: a.boolean().default(true),
    })
    .secondaryIndexes((index) => [
        index('plate').name('byPlate').queryField('listWantedPlatesByPlate')
    ])
    .authorization((allow) => [allow.groups(['admin'])]),

    PlateCheckResult: a.customType({
        found: a.boolean().required(),
        plate: a.string().required(),
        id: a.id(),
        vehicleType: a.string(),
        brand: a.string(),
        line: a.string(),
        color: a.string(),
        modelYear: a.string(),
        reason: a.string(),
        priority: a.string(),
        notes: a.string(),
    }),

    /**
     * Endpoint que consume la app móvil: verifica si una placa está en el listado.
     * Solo expone el resultado de la placa consultada, nunca el listado completo.
     */
    checkPlate: a.query()
        .arguments({ plate: a.string().required() })
        .returns(a.ref('PlateCheckResult'))
        .authorization((allow) => [allow.groups(['admin', 'operario', 'camara'])])
        .handler(a.handler.custom({
            dataSource: a.ref('WantedPlate'),
            entry: '../resolvers/checkPlate.js'
        })),

    /**
     * Endpoint principal de la app y de las cámaras fijas: verifica la placa
     * (igual que checkPlate) y además guarda la lectura en el historial
     * PlateSighting, esté o no en el listado.
     */
    reportSighting: a.mutation()
        .arguments({
            plate: a.string().required(),
            latitude: a.float(),
            longitude: a.float(),
            locationName: a.string(),
            address: a.string(),
            accuracy: a.float(),
            sourceType: a.string(),
            sourceName: a.string(),
            rawText: a.string(),
        })
        .returns(a.ref('PlateCheckResult'))
        .authorization((allow) => [allow.groups(['admin', 'operario', 'camara'])])
        .handler([
            a.handler.custom({
                dataSource: a.ref('WantedPlate'),
                entry: '../resolvers/checkPlate.js'
            }),
            a.handler.custom({
                dataSource: a.ref('PlateSighting'),
                entry: '../resolvers/saveSighting.js'
            }),
        ]),
}
