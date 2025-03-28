// Mock Angular's TestBed
jest.mock('@angular/core/testing', () => ({
  TestBed: {
    configureTestingModule: jest.fn(),
    inject: jest.fn(),
    createComponent: jest.fn()
  }
}));

// Mock Angular's ComponentFixture
jest.mock('@angular/core/testing', () => ({
  ComponentFixture: jest.fn().mockImplementation(() => ({
    detectChanges: jest.fn(),
    componentInstance: {},
    nativeElement: {}
  }))
}));

// Mock Angular's Storage
jest.mock('@ionic/storage-angular', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }))
}));

// Mock Apollo
jest.mock('apollo-angular', () => ({
  Apollo: jest.fn().mockImplementation(() => ({
    mutate: jest.fn()
  }))
})); 