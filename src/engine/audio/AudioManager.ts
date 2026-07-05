export type SfxOptions = {
  volume?: number;
  /** Playback rate (pitch); 1 = normal. */
  rate?: number;
};

export type ToneOptions = {
  volume?: number;
  type?: OscillatorType;
};

export type BgmOptions = {
  volume?: number;
  loop?: boolean;
};

/**
 * Global audio hub (Web Audio API).
 *
 * One shared graph: every source runs through a category gain (`bgm` or `sfx`)
 * into a `master` gain into the speakers, so volumes and mute are one knob each.
 *
 * Browsers start an AudioContext suspended until a user gesture, so the manager
 * installs one-time pointer/key listeners that resume it (and start any BGM
 * that was requested early). SFX can come from decoded files (`load` + `playSfx`)
 * or from the built-in {@link tone} synth, which needs no assets.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private readonly buffers = new Map<string, AudioBuffer>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private pendingBgm: { name: string; options: BgmOptions } | null = null;

  private masterLevel = 1;
  private bgmLevel = 0.6;
  private sfxLevel = 0.8;
  private mutedFlag = false;
  private unlockInstalled = false;

  static get instance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      return this.ctx;
    }
    if (typeof window === "undefined") {
      return null;
    }
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }

    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.applyGains();
    this.installUnlock();
    return this.ctx;
  }

  private applyGains(): void {
    const master = this.mutedFlag ? 0 : this.masterLevel;
    if (this.masterGain) {
      this.masterGain.gain.value = master;
    }
    if (this.bgmGain) {
      this.bgmGain.gain.value = this.bgmLevel;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxLevel;
    }
  }

  private installUnlock(): void {
    if (this.unlockInstalled || typeof window === "undefined") {
      return;
    }
    const unlock = (): void => {
      void this.ctx?.resume();
      if (this.pendingBgm) {
        const { name, options } = this.pendingBgm;
        this.pendingBgm = null;
        this.playBgm(name, options);
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    this.unlockInstalled = true;
  }

  // --- Volume / mute ---------------------------------------------------------

  get masterVolume(): number {
    return this.masterLevel;
  }
  set masterVolume(value: number) {
    this.masterLevel = Math.max(0, Math.min(1, value));
    this.applyGains();
  }

  get bgmVolume(): number {
    return this.bgmLevel;
  }
  set bgmVolume(value: number) {
    this.bgmLevel = Math.max(0, Math.min(1, value));
    this.applyGains();
  }

  get sfxVolume(): number {
    return this.sfxLevel;
  }
  set sfxVolume(value: number) {
    this.sfxLevel = Math.max(0, Math.min(1, value));
    this.applyGains();
  }

  get muted(): boolean {
    return this.mutedFlag;
  }
  set muted(value: boolean) {
    this.mutedFlag = value;
    this.applyGains();
  }

  // --- Loading / SFX ---------------------------------------------------------

  /** Fetch + decode an audio file. Returns false (no throw) if it can't load. */
  async load(name: string, url: string): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) {
      return false;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return false;
      }
      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);
      this.buffers.set(name, buffer);
      return true;
    } catch {
      return false;
    }
  }

  hasSound(name: string): boolean {
    return this.buffers.has(name);
  }

  /** Play a loaded sound as a one-shot SFX. No-op if not loaded. */
  playSfx(name: string, options?: SfxOptions): void {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if (!ctx || !this.sfxGain || !buffer) {
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = options?.volume ?? 1;
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  /** Synthesized one-shot beep — an SFX with no asset needed. */
  tone(frequency: number, duration = 0.15, options?: ToneOptions): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) {
      return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = options?.type ?? "sine";
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    const volume = options?.volume ?? 0.3;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Build a soft, seamlessly-looping chord buffer under `name` — an asset-free
   * source for ambient BGM. Frequencies are snapped to whole cycles over the
   * loop length so the loop point doesn't click.
   */
  makeChord(name: string, frequencies: number[], duration = 4): boolean {
    const ctx = this.ensureContext();
    if (!ctx || frequencies.length === 0) {
      return false;
    }
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    // Snap to integer cycles per loop for a seamless wrap.
    const snapped = frequencies.map((f) => Math.max(1, Math.round(f * duration)) / duration);
    for (let i = 0; i < length; i += 1) {
      const t = i / rate;
      let sample = 0;
      for (const f of snapped) {
        sample += Math.sin(2 * Math.PI * f * t);
      }
      sample /= snapped.length;
      // Gentle amplitude swell over the loop (also seamless: 0 at both ends).
      const swell = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / duration));
      data[i] = sample * 0.6 * swell;
    }
    this.buffers.set(name, buffer);
    return true;
  }

  // --- BGM -------------------------------------------------------------------

  /** Loop a loaded track as background music. Queues if audio is still locked. */
  playBgm(name: string, options?: BgmOptions): void {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if (!ctx || !this.bgmGain || !buffer) {
      return;
    }
    if (options?.volume !== undefined) {
      this.bgmVolume = options.volume;
    }
    // Suspended context can't actually start until a gesture — remember it.
    if (ctx.state === "suspended") {
      this.pendingBgm = { name, options: options ?? {} };
      return;
    }

    this.stopBgm();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = options?.loop ?? true;
    source.connect(this.bgmGain);
    source.start();
    this.bgmSource = source;
  }

  stopBgm(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch {
        // already stopped
      }
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    this.pendingBgm = null;
  }
}
