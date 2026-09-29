import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

// El historial de placas vistas se borra solo después del tiempo definido
// en amplify/data/resolvers/saveSighting.js (atributo `ttl`).
backend.data.resources.cfnResources.amplifyDynamoDbTables['PlateSighting'].timeToLiveAttribute = {
  attributeName: 'ttl',
  enabled: true,
};
