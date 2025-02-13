import { Observable } from 'rxjs';

export interface IAuthService {
  isAuthenticated(): Observable<boolean>;
  isAdmin(): Observable<boolean>;
  isPlatformAdmin(): Observable<boolean>;
  init(): Observable<any>;
  signIn(credentials: any): Observable<any>;
  signOut(): Observable<void>;
}

export interface IStorageService {
  init(): Observable<void>;
  get(key: string): Observable<any>;
  set(key: string, value: any): Observable<void>;
  remove(key: string): Observable<void>;
}