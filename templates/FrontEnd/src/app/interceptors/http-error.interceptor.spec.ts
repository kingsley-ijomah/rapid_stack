// path: src/app/interceptors/http-error.interceptor.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpErrorInterceptor } from './http-error.interceptor';
import { HttpErrorResponse, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ErrorService } from 'src/app/services/errors/error.service';

describe('HttpErrorInterceptor', () => {
  let interceptor: HttpErrorInterceptor;
  let nextSpy: jasmine.SpyObj<HttpHandler>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;

  beforeEach(() => {  
    nextSpy = jasmine.createSpyObj('HttpHandler', ['handle']);
    errorServiceSpy = jasmine.createSpyObj('ErrorService', ['fatalError']);

    TestBed.configureTestingModule({
      providers: [
        HttpErrorInterceptor,
        { provide: HttpHandler, useValue: nextSpy },
        { provide: ErrorService, useValue: errorServiceSpy }
      ]
    });

    interceptor = TestBed.inject(HttpErrorInterceptor);
    nextSpy = TestBed.inject(HttpHandler) as jasmine.SpyObj<HttpHandler>;
    errorServiceSpy = TestBed.inject(ErrorService) as jasmine.SpyObj<ErrorService>;
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should call fatalError on ErrorService when an HttpErrorResponse occurs', () => {
    const mockErrorResponse = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
    const request = new HttpRequest('GET', '/test');

    nextSpy.handle.and.returnValue(throwError(() => mockErrorResponse));

    interceptor.intercept(request, nextSpy).subscribe({
      error: () => {
        expect(errorServiceSpy.fatalError).toHaveBeenCalledWith(mockErrorResponse);
      }
    })
  });

  it('should pass the request through if no error occurs', () => {
    const mockResponse = new HttpResponse({ status: 200 });
    const request = new HttpRequest('GET', '/test');
    
    nextSpy.handle.and.returnValue(of(mockResponse));

    interceptor.intercept(request, nextSpy).subscribe({
      next: (res) => {
        expect(res).toEqual(mockResponse);
      }
    });

    expect(errorServiceSpy.fatalError).not.toHaveBeenCalled();
  });
});
