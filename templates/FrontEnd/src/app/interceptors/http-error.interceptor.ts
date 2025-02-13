// path: src/app/interceptors/http-error.interceptor.ts

import { Injectable } from '@angular/core';
import { 
  HttpInterceptor, 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpErrorResponse
} from '@angular/common/http';
import { ErrorService } from 'src/app/services/errors/error.service';
import { catchError, throwError, Observable } from 'rxjs';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private errorService: ErrorService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const newError = this.errorService.fatalError(error);
        return throwError(() => newError);
      })
    );
  }
}