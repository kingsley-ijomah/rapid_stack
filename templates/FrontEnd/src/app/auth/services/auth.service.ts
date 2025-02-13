import { Injectable } from '@angular/core';
import { StorageService } from 'src/app/services/init/storage.service';
import { Apollo } from 'apollo-angular';
import { SignInMutation } from 'src/app/graphql/mutations/auth/signIn.mutation';
import { forkJoin, throwError, Observable, tap, map, from, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorService } from 'src/app/services/errors/error.service';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

// npm install crypto-js
// npm i --save-dev @types/crypto-js

@Injectable({
  providedIn: 'root',
})
/**
 * AuthService is responsible for handling user authentication, storing user data, and managing user roles.
 * 
 * - **currentUser**: Stores the current authenticated user's details in memory.
 * - **userRole**: Stores the current user's role (admin or student) in memory.
 * - The service handles the encryption and decryption of user data for secure storage.
 * 
 * The service includes:
 * - **signIn()**: Handles user sign-in and stores user data and authentication token.
 * - **storeUserData()**: Saves the user's data and token into secure storage.
 * - **getCurrentUser()**: Retrieves the current user from memory or storage if not present in memory.
 * - **getUserStorageData()**: Fetches and decrypts the user data from storage.
 * - **getTokenStorageData()**: Retrieves the authentication token from storage.
 * - **isAuthenticated()**: Checks if the user is authenticated by verifying the presence of an auth token.
 * - **isAdmin() / isStudent()**: Check if the current user has an admin or student role.
 * - **logout()**: Logs the user out and clears the stored data and in-memory values.
 * 
 * The service leverages RxJS observables to handle asynchronous storage operations and provide reactive support.
 */
export class AuthService {
  private encryptionKey = environment.encryptionKey;
  private currentUser: any = null;
  private userRole: number | null = null;
  private token: string | null = null;

  readonly ROLES = { guest: 0, admin: 1, platformAdmin: 2 }; // User roles

  readonly authTokenKey: string = 'authToken';
  readonly userKey: string = 'user';

  constructor(
    private apollo: Apollo, 
    private storageService: StorageService,
    private errorService: ErrorService
  ) {}

/**
 * Initializes the authentication state by loading the user data and token from secure storage.
 * 
 * - Fetches the user data, role and token from storage and restores them in memory.
 * - Sets `currentUser` and `userRole` in memory for quicker access during the session.
 * 
 * This method should be called during application startup e.g: AppComponent to restore the authentication state.
 * 
 * @returns Observable<void> - Emits when the initialization process is complete.
 */
  init(): Observable<void> {
    return forkJoin([
      this.getUserStorageData(),
      this.getTokenStorageData()
    ]).pipe(
      tap(([user, token]) => {
        this.currentUser = user;
        this.userRole = user ? user.role : null;
        this.token = token;
      }),
      map(() => void 0)  // Ensure the return type is Observable<void>
    );
  }

/**
 * Encrypts the provided data using AES encryption.
 * 
 * - Converts the data into a JSON string and encrypts it with a predefined encryption key.
 * - Returns the encrypted data as a string.
 * 
 * This method is used to securely encrypt sensitive information before storing it.
 * 
 * @param data - The data to be encrypted (e.g., user information).
 * @returns string - The encrypted data as a string.
 */

  private encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
  }

/**
 * Decrypts the provided AES-encrypted data.
 * 
 * - Decrypts the encrypted string using the predefined encryption key.
 * - Converts the decrypted data back into its original JSON format.
 * 
 * This method is used to securely retrieve and decrypt sensitive information from storage.
 * 
 * @param encryptedData - The encrypted data as a string.
 * @returns any - The original decrypted data in its original format.
 */

  private decrypt(encryptedData: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  }

/**
 * Handles user sign-in by sending the provided input to the GraphQL API.
 * 
 * - Sends a mutation request to the backend to authenticate the user.
 * - Processes the server's response and checks for errors.
 * - Returns the sign-in result if successful, or throws validation errors if any are present.
 * 
 * This method is called during the sign-in process to authenticate the user.
 * 
 * @param input - The user credentials (e.g., email, password) for authentication.
 * @returns Observable<any> - Emits the sign-in result or throws an error if sign-in fails.
 */
  signIn(input: any): Observable<any> {
    // First logout to clear any stale data
    return this.logout().pipe(
      switchMap(() => {
        return this.apollo
          .mutate({
            mutation: SignInMutation,
            variables: {
              input: input
            }
          })
          .pipe(
            map((response: any) =>  {
              const result = response.data.signIn
              if (result.errors && result.errors.length > 0) {
                throw this.errorService.validationError(result.errors);
              }
              return result;
            }),
            // Instead of directly subscribing, return the observable
            switchMap(result => this.storeUserData(result)),
          );
      })
    );
  }

/**
 * Stores the user data and authentication token in secure storage.
 * 
 * - Encrypts the user data before saving.
 * - Saves the token and encrypted user data into storage.
 * - Sets the currentUser in memory after successful storage.
 * 
 * This method is called after a successful sign-in to persist user session.
 * 
 * @param result - Contains the authentication token and user data.
 * @returns Observable<void> - Emits when the storage is complete.
 */
  storeUserData(result: any): Observable<void> {
    const { token, data } = result;
    // Encrypt the user data before storing
    const encryptedUser = this.encrypt(data);
  
    return forkJoin([
      this.storageService.set(this.authTokenKey, token),
      this.storageService.set(this.userKey, encryptedUser)
    ]).pipe(
      tap(() => {
        this.currentUser = data;
        this.userRole = data.role;
        this.token = token;
      }),
      map(() => void 0),  // Convert [void, void] to void
    );
  }

/**
 * Checks if the current user has an admin role.
 * 
 * - Compares the user's role with the predefined admin role value.
 * - If `currentUser` is not set, it calls `getCurrentUser()` to fetch the stored user data from storage.
 * 
 * @returns Observable<boolean> - Emits true if the user is an admin, otherwise false.
 */
isAdmin(): Observable<boolean> {
  if (this.userRole === this.ROLES.admin) {
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  } else {
    return this.getCurrentUser().pipe(
      map(user => user && user.role === this.ROLES.admin)
    );
  }
}
 
/**
 * Checks if the current user has a guest role.
 * 
 * - Compares the user's role with the predefined guest role value.
 * - If `currentUser` is not set, it calls `getCurrentUser()` to fetch the stored user data from storage.
 * 
 * @returns Observable<boolean> - Emits true if the user is a guest, otherwise false.
 */
isGuest(): Observable<boolean> {
  if (this.userRole === this.ROLES.guest) {
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  } else {
    return this.getCurrentUser().pipe(
      map(user => user && user.role === this.ROLES.guest)
    );
  }
}

/**
 * Checks if the current user has a platform admin role.
 * 
 * - Compares the user's role with the predefined platform admin role value.
 * - If `currentUser` is not set, it calls `getCurrentUser()` to fetch the stored user data from storage.
 * 
 * @returns Observable<boolean> - Emits true if the user is a platform admin, otherwise false.
 */
isPlatformAdmin(): Observable<boolean> {
  if (this.userRole === this.ROLES.platformAdmin) {
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  } else {
    return this.getCurrentUser().pipe(
      map(user => user && user.role === this.ROLES.platformAdmin)
    );
  }
}

/**
 * Checks if the current user has an owner role. isPlatformAdmin is same as isOwner
 * 
 * - Compares the user's role with the predefined owner role value.
 * - If `currentUser` is not set, it calls `getCurrentUser()` to fetch the stored user data from storage.
 * 
 * @returns Observable<boolean> - Emits true if the user is an owner, otherwise false.
 */
isOwner(): Observable<boolean> {
  if (this.userRole === this.ROLES.platformAdmin) {
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  } else {
    return this.getCurrentUser().pipe(
      map(user => user && user.role === this.ROLES.platformAdmin)
    );
  }
}

/**
 * Retrieves the current user from memory. 
 * If the current user is not in memory, it fetches the user data from secure storage.
 * 
 * - If `currentUser` is not set, calls `getUserStorageData()` to load it from storage.
 * 
 * @returns Observable<any> - Emits the current user or null if not available.
 */
getCurrentUser(): Observable<any> {
  if (this.currentUser) {
    return new Observable(observer => {
      observer.next(this.currentUser);
      observer.complete();
    });
  } else {
    return this.getUserStorageData();
  }
}

/**
 * Retrieves the authentication token from memory if available, otherwise fetches it from secure storage.
 * 
 * - If `token` is already set in memory, it returns an observable that emits the token immediately.
 * - If `token` is not set in memory, it falls back to fetching the token from secure storage.
 * 
 * This method ensures quick access to the token if it's already in memory, while also providing fallback to storage.
 * 
 * @returns Observable<string | null> - Emits the token if available, or null if not found.
 */
getToken(): Observable<string | null> {
  if (this.token) {
    return new Observable(observer => {
      observer.next(this.token);
      observer.complete();
    });
  } else {
    return this.getTokenStorageData();
  }
}

/**
 * Retrieves the stored user data from secure storage.
 * 
 * - Fetches the encrypted user data from storage.
 * - Decrypts the user data and assigns it to `this.currentUser`.
 * - Emits the decrypted user data through the observer or null if no user data is found.
 * - In case of an error, it handles the error and emits it through the observer.
 * 
 * This method is used to fetch and decrypt the user's data from storage.
 * 
 * @returns Observable<any> - Emits the decrypted user data or null if not available.
 */
  getUserStorageData(): Observable<any> {
    return new Observable<any>(observer => {
      this.storageService.get<string>(this.userKey).subscribe({
        next: encryptedUser => {
          if (encryptedUser) {
            const user = this.decrypt(encryptedUser);
            this.currentUser = user;
            observer.next(user);
          } else {
            observer.next(null);
          }
        }
      });
    });
  }

/**
 * Retrieves the stored authentication token from secure storage.
 * 
 * - Fetches the authentication token from storage.
 * - Emits the token if found, or null if no token is available.
 * - In case of an error, it handles the error and emits it through the observer.
 * 
 * This method is used to retrieve the user's authentication token for session management.
 * 
 * @returns Observable<string | null> - Emits the stored token or null if not available.
 */
  getTokenStorageData(): Observable<string | null> {
    return new Observable<string | null>(observer => {
      this.storageService.get<string>(this.authTokenKey).subscribe({
        next: token => {
          if (token) {
            observer.next(token);
          } else {
            observer.next(null);
          }
        },  
      });
    });
  }

/**
 * Checks if the token is expired.
 * 
 * - Parses the token and extracts the expiration time.
 * - Compares the current time with the expiration time.
 * - Returns true if the token is expired, otherwise false.
 * 
 * This method is used to determine if the token has expired.
 * 
 * @param token - The authentication token to check.
 * @returns boolean - True if the token is expired, otherwise false.
 */
private isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiry;
  } catch (e) {
    return true;
  }
}

/**
 * Checks if the user is authenticated by verifying the presence of an authentication token.
 * 
 * - Fetches the authentication token from storage.
 * - Maps the token to a boolean value, returning true if the token exists, false otherwise.
 * 
 * This method is used to determine whether the user is currently authenticated.
 * 
 * @returns Observable<boolean> - Emits true if the user is authenticated, otherwise false.
 */
  isAuthenticated(): Observable<boolean> {
    return from(this.storageService.get(this.authTokenKey)).pipe(
      map(token => {
        if (!token || typeof token !== 'string') return false;
        if (this.isTokenExpired(token)) {
          this.logout().subscribe();
          return false;
        }
        return true;
      })
    );
  }

/**
 * Logs the user out by removing the authentication token and user data from storage.
 * 
 * - Removes both the stored authentication token and user data from secure storage.
 * - Resets the `currentUser` and `userRole` to null after successful removal.
 * 
 * This method is used to log the user out and clear their session data.
 * 
 * @returns Observable<void> - Emits when the logout process is complete.
 */
  logout(): Observable<void> {
    return forkJoin([
      from(this.storageService.remove(this.authTokenKey)),
      from(this.storageService.remove(this.userKey))
    ]).pipe(
      tap(() => {
        this.currentUser = null;
        this.userRole = null;
        this.token = null;
      }),
      map(() => void 0)  // Ensure the return type is Observable<void>
    );
  }
}
