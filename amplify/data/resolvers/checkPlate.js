import { util } from '@aws-appsync/utils';

/**
 * Normaliza la placa: mayúsculas y sin espacios, guiones ni puntos.
 * (APPSYNC_JS no garantiza soporte de regex, por eso se usa split/join)
 */
function normalize(value) {
    return (value || '')
        .toUpperCase()
        .split(' ').join('')
        .split('-').join('')
        .split('.').join('');
}

export function request(ctx) {
    const plate = normalize(ctx.args.plate);
    if (plate.length < 5 || plate.length > 7) {
        util.error('Placa inválida', 'BadRequest');
    }
    return {
        operation: 'Query',
        index: 'byPlate',
        query: {
            expression: '#plate = :plate',
            expressionNames: { '#plate': 'plate' },
            expressionValues: util.dynamodb.toMapValues({ ':plate': plate }),
        },
        limit: 10,
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }
    const plate = normalize(ctx.args.plate);
    const items = (ctx.result && ctx.result.items) || [];
    const match = items.find((item) => item.active !== false);
    if (!match) {
        return { found: false, plate };
    }
    return {
        found: true,
        plate,
        id: match.id,
        vehicleType: match.vehicleType,
        brand: match.brand,
        line: match.line,
        color: match.color,
        modelYear: match.modelYear,
        reason: match.reason,
        priority: match.priority,
        notes: match.notes,
    };
}
