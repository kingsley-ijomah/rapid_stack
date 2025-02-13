import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LaunchingPage } from './launching.page';

describe('LaunchingPage', () => {
  let component: LaunchingPage;
  let fixture: ComponentFixture<LaunchingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LaunchingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
