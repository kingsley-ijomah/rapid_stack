// src/app/services/errors/error-service.ts

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoggingService } from 'src/app/services/logs/logging.service'

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  errors: string[] = [];

  constructor(private loggingService: LoggingService) { }

  validationError(errors: string[] | string): Error {
    this.errors = Array.isArray(errors)? errors : [errors]
    const errorObject = new Error(this.errors.join(';'))
    this.loggingService.logError('Validation Error', errorObject);

    return errorObject;
  }

  fatalError(error: HttpErrorResponse): Error {
    const error_message = 'A fatal error occurred. Please try again later.';
    this.errors = [error_message];

    this.loggingService.logError('Fatal Error', error);
    return new Error(error_message);
  }
}
  