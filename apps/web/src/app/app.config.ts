import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

const SUPPORTED_LANGS = ['en', 'pl', 'uk'];
const DEFAULT_LANG = 'en';

function detectLanguage(): string {
  const raw = navigator.language || DEFAULT_LANG;
  const lang = raw.split('-')[0].toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

function initTranslate(translate: TranslateService) {
  return () => {
    translate.setDefaultLang(DEFAULT_LANG);
    return translate.use(detectLanguage()).toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideIonicAngular(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const translate = inject(TranslateService);
        return initTranslate(translate);
      },
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
