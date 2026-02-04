/**
 * AudioManager - Handles all game audio including sound effects and background music
 */

export type SoundEffect = 'click' | 'purchase' | 'error';

class AudioManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private bgMusic: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;

  constructor() {
    // Pre-load sound effects (files in public/ folder)
    // Use MP3 for smaller file sizes - convert WAV to MP3 with Audacity or online tool
    this.loadSound('click', './mouseclick.mp3');
    this.loadSound('purchase', './sell_buy_item.mp3');
    this.loadSound('error', './negative_2.mp3');

    // Load background music
    this.bgMusic = new Audio('./Bustling City 2.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = this.musicVolume;
  }

  /**
   * Load a sound effect
   */
  private loadSound(name: SoundEffect, filename: string): void {
    const audio = new Audio(filename);
    audio.volume = this.sfxVolume;
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundEffect): void {
    if (this.isMuted) return;

    const audio = this.sounds.get(sound);
    if (audio) {
      // Clone the audio to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.sfxVolume;
      clone.play().catch(() => {
        // Ignore errors (e.g., user hasn't interacted yet)
      });
    }
  }

  /**
   * Play click sound (for UI buttons and controls)
   */
  playClick(): void {
    this.play('click');
  }

  /**
   * Play purchase sound (for successful purchases)
   */
  playPurchase(): void {
    this.play('purchase');
  }

  /**
   * Play error sound (for failed purchases, etc.)
   */
  playError(): void {
    this.play('error');
  }

  /**
   * Start background music
   */
  startMusic(): void {
    if (this.bgMusic && !this.isMuted) {
      this.bgMusic.play().catch(() => {
        // Autoplay blocked - will start on first user interaction
        console.log('Background music will start after user interaction');
      });
    }
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  /**
   * Pause background music
   */
  pauseMusic(): void {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  /**
   * Resume background music
   */
  resumeMusic(): void {
    if (this.bgMusic && !this.isMuted) {
      this.bgMusic.play().catch(() => {});
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.pauseMusic();
    } else {
      this.resumeMusic();
    }

    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.isMuted) {
      this.pauseMusic();
    } else {
      this.resumeMusic();
    }
  }

  /**
   * Check if muted
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicVolume;
    }
  }

  /**
   * Set sound effects volume (0-1)
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((audio) => {
      audio.volume = this.sfxVolume;
    });
  }
}

// Export a singleton instance
export const audioManager = new AudioManager();
