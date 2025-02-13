import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Observable, from, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor(private storage: Storage) {}

  init(): Observable<void> {
    return from(this.storage.create()).pipe(map(() => {}));
  }

  // Set a key-value pair in storage
  set(key: string, value: any): Observable<void> {
    return from(this.storage.set(key, value));
  }

  // Get a value from storage by key
  get<T>(key: string): Observable<T | null> {
    return from(this.storage.get(key));
  }

  // Remove a key-value pair from storage
  remove(key: string): Observable<void> {
    return from(this.storage.remove(key));
  }
}
