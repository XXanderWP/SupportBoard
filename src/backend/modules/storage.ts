import fs from 'fs';
import { StorageDefault } from '../../shared/storage';

export const Storage = new (class {
  private _data: typeof StorageDefault = JSON.parse(
    JSON.stringify(StorageDefault)
  );
  private _loaded = false;
  private _onLoadCallbacks: (() => void)[] = [];
  private _changed = false;
  get data() {
    if (!this._loaded) {
      throw new Error(
        'Storage is not loaded yet. Please wait for the onLoad callback.'
      );
    }
    return this._data;
  }
  Get<T extends keyof typeof StorageDefault>(
    key: T
  ): (typeof StorageDefault)[T] {
    return this.data[key];
  }
  UpdateData(newData: Partial<typeof StorageDefault>, save = true) {
    this._data = { ...this._data, ...newData };
    this._changed = true;
    if (save) {
      this.Save();
    }
  }
  constructor() {
    this.Load();
    process.on('exit', () => {
      console.log('Process exiting, saving storage...');
      this.Save();
    });
    process.on('SIGINT', () => {
      process.exit();
    });
    process.on('SIGTERM', () => {
      process.exit();
    });
  }
  OnLoad(callback: () => void) {
    if (this._loaded) {
      callback();
      return;
    }
    this._onLoadCallbacks.push(callback);
  }
  Save() {
    if (!this._changed) return;
    try {
      fs.writeFileSync(
        '.storage',
        JSON.stringify(this._data, null, 2),
        'utf-8'
      );
      this._changed = false;
    } catch (e) {
      console.error('Failed to save storage:', e);
    }
  }
  private Load() {
    if (fs.existsSync('.storage')) {
      try {
        const data = fs.readFileSync('.storage', 'utf-8');
        this._data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to load storage:', e);
        this._data = JSON.parse(JSON.stringify(StorageDefault));
      }
    }
    this._loaded = true;
    this._onLoadCallbacks.forEach(callback => callback());
  }
})();
