import { browser } from '$app/environment';
import type { AccessibilitySettings } from '$lib/types';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '$lib/types';

const STORAGE_KEY = 'sharefeed_settings';

/**
 * Reactive accessibility settings state using Svelte 5 runes.
 * Settings are persisted to localStorage.
 */
class SettingsStore {
  private _settings = $state<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);

  constructor() {
    if (browser) {
      this.load();
    }
  }

  get settings(): AccessibilitySettings {
    return this._settings;
  }

  get fontSize(): number {
    return this._settings.fontSize;
  }

  get highContrast(): boolean {
    return this._settings.highContrast;
  }

  get showThumbnails(): boolean {
    return this._settings.showThumbnails;
  }

  get reducedMotion(): boolean {
    return this._settings.reducedMotion;
  }

  setFontSize(size: number): void {
    const clamped = Math.max(14, Math.min(32, size));
    this._settings = { ...this._settings, fontSize: clamped };
    this.save();
  }

  setHighContrast(enabled: boolean): void {
    this._settings = { ...this._settings, highContrast: enabled };
    this.save();
  }

  setShowThumbnails(show: boolean): void {
    this._settings = { ...this._settings, showThumbnails: show };
    this.save();
  }

  setReducedMotion(reduced: boolean): void {
    this._settings = { ...this._settings, reducedMotion: reduced };
    this.save();
  }

  reset(): void {
    this._settings = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
    this.save();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this._settings = { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed };
      }
    } catch {
      // Use defaults on error
    }
  }

  private save(): void {
    if (browser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
      } catch {
        // Ignore storage errors
      }
    }
  }
}

export const settingsStore = new SettingsStore();
