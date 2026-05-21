import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WelcomeService } from './welcome.service';

describe('WelcomeService', () => {
  let service: WelcomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WelcomeService],
    });
    service = TestBed.inject(WelcomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('returns API message and caches it', () =>
    new Promise<void>(resolve => {
      service.getMessage().subscribe(msg => {
        expect(msg).toBe('BE is welcoming you to the family shopping list');
        expect(localStorage.getItem('fsl_welcome_message')).toBe(
          'BE is welcoming you to the family shopping list',
        );
        resolve();
      });

      httpMock
        .expectOne(req => req.url.includes('/api/get-welcome-message'))
        .flush({ message: 'BE is welcoming you to the family shopping list' });
    }));

  it('returns cached message when API fails', () =>
    new Promise<void>(resolve => {
      localStorage.setItem('fsl_welcome_message', 'cached message');

      service.getMessage().subscribe(msg => {
        expect(msg).toBe('cached message');
        resolve();
      });

      httpMock
        .expectOne(req => req.url.includes('/api/get-welcome-message'))
        .error(new ProgressEvent('network error'));
    }));

  it('returns hardcoded fallback when API fails and no cache', () =>
    new Promise<void>(resolve => {
      service.getMessage().subscribe(msg => {
        expect(msg).toBe('welcome to the family shopping list');
        resolve();
      });

      httpMock
        .expectOne(req => req.url.includes('/api/get-welcome-message'))
        .error(new ProgressEvent('network error'));
    }));
});
