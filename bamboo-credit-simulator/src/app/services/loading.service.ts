
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCount = 0;

  public loading$ = this.loadingSubject.asObservable();

  show(): void {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  hide(): void {
    if (this.loadingCount > 0) {
      this.loadingCount--;
    }
    
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  forceHide(): void {
    this.loadingCount = 0;
    this.loadingSubject.next(false);
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }
}