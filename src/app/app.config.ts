import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { I18n, parseAmplifyConfig } from 'aws-amplify/utils';
import { provideRouter } from '@angular/router';
import { translations } from '@aws-amplify/ui-angular';
import { routes } from './app.routes';

import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
const amplifyConfig = parseAmplifyConfig(outputs);
I18n.putVocabularies(translations);
I18n.setLanguage('es');

Amplify.configure({
  ...amplifyConfig
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};
