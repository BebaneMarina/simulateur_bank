// src/app/core/services/local-storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private isLocalStorageAvailable(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  setItem(key: string, value: any): void {
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }

  getItem<T>(key: string): T | null {
    if (this.isLocalStorageAvailable()) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    }
    return null;
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    }
  }

  // Méthodes spécifiques pour l'application
  saveSimulation(simulation: any): void {
    const simulations = this.getItem<any[]>('saved_simulations') || [];
    simulations.push({
      ...simulation,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    });
    this.setItem('saved_simulations', simulations);
  }

  getSavedSimulations(): any[] {
    return this.getItem<any[]>('saved_simulations') || [];
  }

  removeSimulation(id: string): void {
    const simulations = this.getSavedSimulations();
    const filteredSimulations = simulations.filter(sim => sim.id !== id);
    this.setItem('saved_simulations', filteredSimulations);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}