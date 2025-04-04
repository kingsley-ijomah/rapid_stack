import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GraphQLService } from '../../services/graphql.service';
import { ToastService } from '../../services/ui/toast.service';
import { ErrorService } from '../../services/errors/error.service';
import { Observable } from 'rxjs';

export class BaseGraphQLPage {
  protected graphQLService = inject(GraphQLService);
  protected toastService = inject(ToastService);
  protected errorService = inject(ErrorService);
  protected destroyRef = inject(DestroyRef);

  protected executeMutation<T>({
    mutation,
    variables,
    responsePath,
    successMessage,
    errorMessage = 'Operation failed. Please try again.',
    onSuccess,
    onError
  }: {
    mutation: any;
    variables: any;
    responsePath: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
  }): Observable<T> {
    const request = this.graphQLService
      .mutate<T>(mutation, variables, responsePath)
      .pipe(takeUntilDestroyed(this.destroyRef));

    request.subscribe({
      next: (result) => {
        if (successMessage) {
          this.toastService.showToast({
            message: successMessage,
            color: 'success'
          });
        }
        if (onSuccess) onSuccess(result);
      },
      error: (error) => {
        this.toastService.showToast({
          message: errorMessage,
          color: 'danger'
        });
        if (onError) onError(error);
      }
    });

    return request;
  }

  protected executeQuery<T>({
    query,
    variables,
    responsePath,
    fetchPolicy = 'cache-first',
    errorMessage = 'Failed to load data. Please try again.',
    onSuccess,
    onError
  }: {
    query: any;
    variables: any;
    responsePath: string;
    fetchPolicy?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
  }): Observable<T> {
    const request = this.graphQLService
      .query<T>(query, variables, responsePath, fetchPolicy)
      .pipe(takeUntilDestroyed(this.destroyRef));

    request.subscribe({
      next: (result) => {
        if (onSuccess) onSuccess(result);
      },
      error: (error) => {
        this.toastService.showToast({
          message: errorMessage,
          color: 'danger'
        });
        if (onError) onError(error);
      }
    });

    return request;
  }
} 