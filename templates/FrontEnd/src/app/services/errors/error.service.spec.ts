// src/app/services/errors/error-service.spec.ts

import { TestBed } from '@angular/core/testing';

import { ErrorService } from './error.service';
import { LoggingService } from '../logs/logging.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorService', () => {
  let service: ErrorService;
  let loggingSpy: jasmine.SpyObj<LoggingService>;
  let httpError = new HttpErrorResponse({
    error: 'Server error',
    status: 500,
    statusText: 'Internal Server Error'
  });

  beforeEach(() => {
    loggingSpy = jasmine.createSpyObj('LoggingService', ['logError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: loggingSpy }
      ]
    });
    service = TestBed.inject(ErrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call validationError with string argument and return type Error', () => {
    const error_message = 'Email is required';
    const result = service.validationError(error_message);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toEqual(error_message)
  });

  it('should call validationError with array argument', () => {
    const error_message = ['Email is required', 'Fullname is required']
    const result = service.validationError(error_message)

    expect(result.message).toEqual('Email is required;Fullname is required')
    expect(service.errors).toEqual(error_message);
  });

  it('should call log error on loggingSpy', () => {
    const error_message = 'Email is required';
    const error = new Error(error_message);

    const result = service.validationError(error_message);
    
    expect(loggingSpy.logError).toHaveBeenCalledWith('Validation Error', error);
    expect(result).toEqual(error);
  });

  it('should call fatalError with argument', () => {
    const error_message = 'A fatal error occurred. Please try again later.';
    const result = service.fatalError(httpError);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(error_message);
    expect(service.errors).toEqual([error_message]);
  });

  it('should call loggingSpy on fatalError', () => {
    service.fatalError(httpError);
    expect(loggingSpy.logError).toHaveBeenCalledWith('Fatal Error', httpError)
  })
});
