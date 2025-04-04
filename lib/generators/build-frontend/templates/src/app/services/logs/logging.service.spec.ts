import { TestBed } from '@angular/core/testing';

import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { CREATE_LOG } from 'src/app/graphql/mutations/logging.mutation';

// mock apollo service
class ApolloMock {
  mutate = jasmine.createSpy('mutate').and.returnValue(of({}))
};

describe('LoggingService', () => {
  let service: LoggingService;
  let apollo: Apollo;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Apollo, useClass: ApolloMock }
      ]
    });
    service = TestBed.inject(LoggingService);
    apollo = TestBed.inject(Apollo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log error to console in development mode', () => {
    // by setting this evnironment variable to false, 
    // we are setting the application to development mode
    environment.production = false;

    // spy on console log
    // this will prevent the console.log from being called
    // instead we will provide a spy to check if the console.log was called
    const consoleSpy = spyOn(console, 'log');

    // input
    // these are the parameters that will be 
    // passed to the logError method
    const level = 'error';
    const message = 'Signup Error Example';
    const error = new Error('Fatal Error Occured');

    // call logError method
    // service is an instance of the LoggingService
    // we are calling the logError method of the LoggingService
    service.logError(message, error, level);

    // check if console.log was called
    // we are checking if the console.log was called
    // with the correct parameters
    expect(consoleSpy).toHaveBeenCalled();

    // check if console.log was called with the correct parameters
    // we are checking if the console.log was called with the correct parameters
    expect(consoleSpy).toHaveBeenCalledWith(`Level: ${level}, Message: ${message}, Error: ${error}`);
  });

  it('should log error to server in production mode', () => {
    // we are setting the application to production mode
    environment.production = true;

    // set input parameters
    const level = 'error';
    const message = 'Signup Error Example';
    const error = new Error('Fatal Error Occured');

    // Mocking the timestamp
    const mockTimestamp = '2024-09-24T12:34:56.789Z';
    spyOn(Date.prototype, 'toISOString').and.returnValue(mockTimestamp);

    // call logError method
    service.logError(message, error, level);

    // expect apollo.mutate to have been called
    // we are checking if the apollo.mutate method was called 
    expect(apollo.mutate).toHaveBeenCalled();
    // we are checking if the apollo.mutate method was called 
    // with the correct parameters
    expect(apollo.mutate).toHaveBeenCalledWith({
      mutation: CREATE_LOG,
      variables: {
        input: {
          level,
          message,
          timestamp: mockTimestamp,
          data: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        }
      }
    });
  });
});
