import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { Storage } from '@ionic/storage-angular';
import { of } from 'rxjs';

describe('StorageService - init', () => {
  let service: StorageService;
  let storageSpy: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    const storageMock = jasmine.createSpyObj('Storage', ['create', 'set', 'get', 'remove']);

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: Storage, useValue: storageMock }
      ]
    });

    service = TestBed.inject(StorageService);
    storageSpy = TestBed.inject(Storage) as jasmine.SpyObj<Storage>;
  });

  it('should initialize storage successfully', (done: DoneFn) => {
    // Mock the create method to return a resolved Promise with a mock Storage instance
    storageSpy.create.and.returnValue(Promise.resolve(storageSpy));

    service.init().subscribe({
      next: () => {
        // Ensure that the create method is called
        expect(storageSpy.create).toHaveBeenCalled();

        done();
      },
      error: (err) => {
        fail('Expected no error, but got: ' + err);
        done();
      }
    });
  });

  it('should set a key-value pair in storage successfully', (done: DoneFn) => {
    const key = 'testKey';
    const value = 'testValue';

    // Mock the storage set method to return a resolved promise
    storageSpy.set.and.returnValue(Promise.resolve());

    service.set(key, value).subscribe({
      next: () => {
        // Verify that storage.set was called with the correct key and value
        expect(storageSpy.set).toHaveBeenCalledWith(key, value);
        done();
      },
      error: (err) => {
        fail('Expected no error, but got: ' + err);
        done();
      }
    });
  });

  it('should get the value for a given key from storage successfully', (done: DoneFn) => {
    const key = 'testKey';
    const mockValue = 'testValue';

    // Mock the storage get method to return a resolved promise with the mock value
    storageSpy.get.and.returnValue(Promise.resolve(mockValue));

    service.get<string>(key).subscribe({
      next: (value) => {
        // Verify that storage.get was called with the correct key
        expect(storageSpy.get).toHaveBeenCalledWith(key);

        // Expect the value to be the same as the mock value returned
        expect(value).toEqual(mockValue);

        done();
      },
      error: (err) => {
        fail('Expected no error, but got: ' + err);
        done();
      }
    });
  });

  it('should remove the key-value pair from storage successfully', (done: DoneFn) => {
    const key = 'testKey';

    // Mock the storage remove method to return a resolved promise
    storageSpy.remove.and.returnValue(Promise.resolve());

    service.remove(key).subscribe({
      next: () => {
        // Verify that storage.remove was called with the correct key
        expect(storageSpy.remove).toHaveBeenCalledWith(key);
        done();
      },
      error: (err) => {
        fail('Expected no error, but got: ' + err);
        done();
      }
    });
  });
});
