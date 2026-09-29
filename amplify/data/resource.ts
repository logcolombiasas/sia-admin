import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { WantedPlateModel } from './models/WantedPlate';
import { PlateDetectionModel } from './models/PlateDetection';
import { PlateSightingModel } from './models/PlateSighting';

const schema = a.schema({
  ...WantedPlateModel,
  ...PlateDetectionModel,
  ...PlateSightingModel,
});

export type Schema = ClientSchema<typeof schema>;

// Todo el acceso es con usuarios de Cognito (grupos admin / operario / camara); no hay API key.
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
