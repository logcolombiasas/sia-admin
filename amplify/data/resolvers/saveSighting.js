import { util } from '@aws-appsync/utils';

/** Días que se conserva cada registro del historial de placas (TTL de DynamoDB) */
const RETENTION_DAYS = 180;

/**
 * Segundo paso de `reportSighting`: guarda la lectura en PlateSighting
 * usando el resultado de la búsqueda en el listado (paso anterior, checkPlate.js).
 */
export function request(ctx) {
    const check = ctx.prev.result;
    ctx.stash.check = check;

    const args = ctx.args;
    const identity = ctx.identity || {};
    const claims = identity.claims || {};
    const now = util.time.nowISO8601();

    const values = {
        __typename: 'PlateSighting',
        plate: check.plate,
        seenAt: now,
        wanted: check.found,
        wantedPlateId: check.id,
        latitude: args.latitude,
        longitude: args.longitude,
        locationName: args.locationName,
        sourceType: args.sourceType || 'movil',
        sourceName: args.sourceName || claims.email || identity.username,
        rawText: args.rawText,
        createdAt: now,
        updatedAt: now,
        ttl: util.time.nowEpochSeconds() + RETENTION_DAYS * 24 * 60 * 60,
    };

    // DynamoDB no acepta atributos nulos/indefinidos en el mapeo
    const item = {};
    for (const key of Object.keys(values)) {
        if (values[key] !== undefined && values[key] !== null) {
            item[key] = values[key];
        }
    }

    return {
        operation: 'PutItem',
        key: util.dynamodb.toMapValues({ id: util.autoId() }),
        attributeValues: util.dynamodb.toMapValues(item),
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }
    return ctx.stash.check;
}
