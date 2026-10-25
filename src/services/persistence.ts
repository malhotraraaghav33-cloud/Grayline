/**
 * Local Persistence & Offline Sync Service
 * Uses IndexedDB with transparent localStorage fallback
 */

import { Patient, Hazard, QueuedSyncItem } from '../types';

const DB_NAME = 'GraylineTacticalDB';
const DB_VERSION = 1;
const STORE_NAME = 'tactical_state';

interface PersistedState {
  patients: Patient[];
  hazards: Hazard[];
  syncQueue: QueuedSyncItem[];
  mascalActive: boolean;
  lastSyncTime: string;
}

export class TacticalStorage {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.initIndexedDB();
  }

  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = (event: any) => {
          resolve(event.target.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB unavailable, falling back to LocalStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }

  async saveState(state: PersistedState): Promise<boolean> {
    try {
      const db = await this.dbPromise;
      if (db) {
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(state, 'current_state');
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(this.saveToLocalStorage(state));
          } catch {
            resolve(this.saveToLocalStorage(state));
          }
        });
      } else {
        return this.saveToLocalStorage(state);
      }
    } catch {
      return this.saveToLocalStorage(state);
    }
  }

  async loadState(): Promise<PersistedState | null> {
    try {
      const db = await this.dbPromise;
      if (db) {
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('current_state');
            req.onsuccess = () => {
              if (req.result) {
                resolve(req.result as PersistedState);
              } else {
                resolve(this.loadFromLocalStorage());
              }
            };
            req.onerror = () => resolve(this.loadFromLocalStorage());
          } catch {
            resolve(this.loadFromLocalStorage());
          }
        });
      } else {
        return this.loadFromLocalStorage();
      }
    } catch {
      return this.loadFromLocalStorage();
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
      localStorage.removeItem('grayline_persisted_state');
    } catch (err) {
      console.warn('Clear storage error:', err);
    }
  }

  private saveToLocalStorage(state: PersistedState): boolean {
    try {
      localStorage.setItem('grayline_persisted_state', JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('LocalStorage write failed:', e);
      return false;
    }
  }

  private loadFromLocalStorage(): PersistedState | null {
    try {
      const raw = localStorage.getItem('grayline_persisted_state');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
    }
    return null;
  }
}

export const tacticalStorage = new TacticalStorage();
