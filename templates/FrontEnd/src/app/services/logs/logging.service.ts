import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Apollo } from 'apollo-angular';
import { CREATE_LOG } from 'src/app/graphql/mutations/logging.mutation';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {

  constructor(private apollo: Apollo) { }

  logError(message: string, error: Error, level: string = 'error') {
    // check if application is in development mode
    if (environment.production) {
      // get current timestamp
      const timestamp = new Date().toISOString();
      // log error to server
      this.apollo.mutate({
        mutation: CREATE_LOG,
        variables: {
          input: {
            level,
            message,
            timestamp,
            data: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          }
        }
      })
    } else {
      console.log(`Level: ${level}, Message: ${message}, Error: ${error}`);
    }
  }
}
