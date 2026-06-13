const SFX_NAMES = ['button-click', 'button-back', 'game-start', 'success', 'not-true', 'win', 'fail', 'cute'] as const;
type SfxName = typeof SFX_NAMES[number];

const MUSIC_VOL_KEY = 'caofox_mvol';
const SOUND_VOL_KEY = 'caofox_svol';

class AudioService {
  private music: HTMLAudioElement | null = null;
  private sfx: Partial<Record<SfxName, HTMLAudioElement>> = {};
  private musicEnabled = true;
  private soundEnabled = true;
  private _musicVol = 0.4;
  private _soundVol = 0.7;

  init() {
    const mv = localStorage.getItem(MUSIC_VOL_KEY);
    const sv = localStorage.getItem(SOUND_VOL_KEY);
    if (mv !== null) this._musicVol = Number(mv);
    if (sv !== null) this._soundVol = Number(sv);
    this.musicEnabled = this._musicVol > 0;
    this.soundEnabled = this._soundVol > 0;

    this.music = new Audio('/assets/audio/theme-music.mp3');
    this.music.loop = true;
    this.music.volume = this._musicVol;

    SFX_NAMES.forEach((name) => {
      const el = new Audio(`/assets/audio/${name}.mp3`);
      el.volume = this._soundVol;
      this.sfx[name] = el;
    });
  }

  startMusic() {
    if (this.musicEnabled && this._musicVol > 0) this.music?.play().catch(() => {});
  }

  play(name: SfxName) {
    if (!this.soundEnabled) return;
    const s = this.sfx[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  getMusicVolume() { return this._musicVol; }
  getSoundVolume() { return this._soundVol; }

  pauseMusic() {
    this.musicEnabled = false;
    this.music?.pause();
  }

  setMusicVolume(vol: number) {
    this._musicVol = vol;
    localStorage.setItem(MUSIC_VOL_KEY, String(vol));
    if (this.music) this.music.volume = vol;
    this.musicEnabled = vol > 0;
    if (vol > 0) this.music?.play().catch(() => {});
    else this.music?.pause();
  }

  setSoundVolume(vol: number) {
    this._soundVol = vol;
    localStorage.setItem(SOUND_VOL_KEY, String(vol));
    this.soundEnabled = vol > 0;
    SFX_NAMES.forEach(n => { if (this.sfx[n]) this.sfx[n]!.volume = vol; });
  }

  applySettings(music: boolean, sound: boolean) {
    if (!music) { this.musicEnabled = false; this.music?.pause(); }
    else { this.musicEnabled = this._musicVol > 0; this.startMusic(); }
    this.soundEnabled = sound && this._soundVol > 0;
  }
}

export const audio = new AudioService();
audio.init();
