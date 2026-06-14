const SFX_NAMES = ['button-click', 'button-back', 'game-start', 'success', 'not-true', 'win', 'fail', 'cute'] as const;
type SfxName = typeof SFX_NAMES[number];

const DEFAULT_MUSIC_VOL = 0.4;
const DEFAULT_SOUND_VOL = 0.7;

class AudioService {
  private music: HTMLAudioElement | null = null;
  private sfx: Partial<Record<SfxName, HTMLAudioElement>> = {};
  private musicEnabled = true;
  private soundEnabled = true;
  private _musicVol = DEFAULT_MUSIC_VOL;
  private _soundVol = DEFAULT_SOUND_VOL;
  // Ghi nhớ nhạc có đang phát trước khi tab bị ẩn không
  private _wasPlayingBeforeHidden = false;

  init() {
    this.music = new Audio('/assets/audio/theme-music.mp3');
    this.music.loop = true;
    this.music.volume = this._musicVol;

    SFX_NAMES.forEach((name) => {
      const el = new Audio(`/assets/audio/${name}.mp3`);
      el.volume = this._soundVol;
      this.sfx[name] = el;
    });

    // Pause khi tab bị ẩn, resume khi quay lại
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._wasPlayingBeforeHidden = this.musicEnabled && !this.music?.paused;
        this.music?.pause();
      } else {
        if (this._wasPlayingBeforeHidden) {
          this.music?.play().catch(() => {});
        }
      }
    });
  }

  applyVolumes(musicVol: number, soundVol: number) {
    this._musicVol = musicVol;
    this._soundVol = soundVol;
    if (this.music) this.music.volume = musicVol;
    SFX_NAMES.forEach(n => { if (this.sfx[n]) this.sfx[n]!.volume = soundVol; });
  }

  startMusic() {
    if (this.musicEnabled && this._musicVol > 0) this.music?.play().catch(() => {});
  }

  play(name: SfxName) {
    if (!this.soundEnabled || document.hidden) return;
    const s = this.sfx[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  getMusicVolume() { return this._musicVol; }
  getSoundVolume() { return this._soundVol; }

  pauseMusic() {
    this.musicEnabled = false;
    this._wasPlayingBeforeHidden = false;
    this.music?.pause();
  }

  setMusicVolume(vol: number) {
    this._musicVol = vol;
    if (this.music) this.music.volume = vol;
    this.musicEnabled = vol > 0;
    if (vol > 0 && !document.hidden) this.music?.play().catch(() => {});
    else this.music?.pause();
  }

  setSoundVolume(vol: number) {
    this._soundVol = vol;
    this.soundEnabled = vol > 0;
    SFX_NAMES.forEach(n => { if (this.sfx[n]) this.sfx[n]!.volume = vol; });
  }

  applySettings(music: boolean, sound: boolean) {
    if (!music) { this.musicEnabled = false; this._wasPlayingBeforeHidden = false; this.music?.pause(); }
    else { this.musicEnabled = this._musicVol > 0; this.startMusic(); }
    this.soundEnabled = sound && this._soundVol > 0;
  }
}

export const audio = new AudioService();
audio.init();
