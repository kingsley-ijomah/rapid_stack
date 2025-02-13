import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { ErrorService } from './errors/error.service';

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  constructor(
    protected apollo: Apollo,
    protected errorService: ErrorService
  ) { }

  mutate<T>(mutation: any, variables: any, responsePath: string): Observable<T> {
    return this.apollo.mutate({
      mutation: mutation,
      variables: variables
    }).pipe(
      map((response: any) => {
        const result = response.data[responsePath];

        if (result?.errors && result.errors.length > 0) {
          throw this.errorService.validationError(result.errors);
        }

        return result;
      })
    );
  }

/**
 * Executes a GraphQL query and returns the response as an observable.
 *
 * @template T - The type of the expected response.
 * @param {any} query - The GraphQL query to be executed.
 * @param {any} variables - The variables to be passed along with the query.
 * @param {string} responsePath - The path to the data within the response.
 *        This should correspond to the name of the query or mutation field being fetched.
 * @param {any} [fetchPolicy='cache-first'] - The fetch policy to use when executing the query.
 *        Possible values are:
 *          - 'cache-first': Uses cached data if available; otherwise, fetches from the network.
 *          - 'network-only': Always fetches data from the network.
 *          - 'cache-only': Uses only cached data and does not make a network request.
 *          - 'no-cache': Does not cache the result and always fetches from the network.
 *          - 'cache-and-network': Returns cached data if available, then fetches from the network.
 * @returns {Observable<T>} An observable of the response data.
 * @throws Will throw an error if the response contains errors.
 */
  query<T>(query: any, variables: any, responsePath: string, fetchPolicy: any = 'cache-first'): Observable<T> {
    return this.apollo.query({
      query: query,
      variables: variables,
      fetchPolicy: fetchPolicy
    }).pipe(
      map((response: any) => {
        const result = response.data[responsePath];
        
        if (result?.errors && result.errors.length > 0) {
          throw this.errorService.validationError(result.errors);
        }
        return result;
      })
    );
  }
}
