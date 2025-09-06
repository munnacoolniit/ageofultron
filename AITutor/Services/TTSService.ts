import { TTSConfig } from "../Types";

export class TTSService {
  private config: TTSConfig;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  constructor(config: Partial<TTSConfig> = {}) {
    this.config = {
      enabled: true,
      rate: 0.9,
      pitch: 1.0,
      volume: 0.8,
      ...config,
    };

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    if (!this.synthesis || this.isInitialized) return;

    // Wait for voices to be loaded
    await this.loadVoices();

    // Select best voice
    this.selectBestVoice();

    this.isInitialized = true;
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      const updateVoices = () => {
        this.voices = this.synthesis!.getVoices();
        if (this.voices.length > 0) {
          resolve();
        }
      };

      // Some browsers load voices asynchronously
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = updateVoices;
      }

      // Check if voices are already loaded
      updateVoices();

      // Fallback timeout
      setTimeout(resolve, 1000);
    });
  }

  private selectBestVoice(): void {
    if (this.voices.length === 0) return;

    // Preference order: female English voice, then any English, then default
    const preferences = [
      (voice: SpeechSynthesisVoice) =>
        voice.lang.startsWith("en") &&
        voice.name.toLowerCase().includes("female"),
      (voice: SpeechSynthesisVoice) =>
        voice.lang.startsWith("en") &&
        !voice.name.toLowerCase().includes("male"),
      (voice: SpeechSynthesisVoice) => voice.lang.startsWith("en"),
      (voice: SpeechSynthesisVoice) => voice.default,
      () => true, // fallback to first available
    ];

    for (const preference of preferences) {
      const voice = this.voices.find(preference);
      if (voice) {
        this.config.voice = voice;
        break;
      }
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.config.enabled || !this.synthesis || !text.trim()) {
      return;
    }

    // Stop any current speech
    this.stop();

    // Clean text for better speech
    const cleanText = this.cleanTextForSpeech(text);

    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error("Speech synthesis not available"));
        return;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(cleanText);

      // Configure utterance
      this.currentUtterance.rate = this.config.rate;
      this.currentUtterance.pitch = this.config.pitch;
      this.currentUtterance.volume = this.config.volume;

      if (this.config.voice) {
        this.currentUtterance.voice = this.config.voice;
      }

      // Set up event listeners
      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Start speaking
      try {
        this.synthesis.speak(this.currentUtterance);
      } catch (error) {
        this.currentUtterance = null;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  pause(): void {
    if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }

  isPaused(): boolean {
    return this.synthesis?.paused || false;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.config.voice = voice;
  }

  setRate(rate: number): void {
    this.config.rate = Math.max(0.1, Math.min(10, rate)); // Clamp between 0.1 and 10
  }

  setPitch(pitch: number): void {
    this.config.pitch = Math.max(0, Math.min(2, pitch)); // Clamp between 0 and 2
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
  }

  getConfig(): TTSConfig {
    return { ...this.config };
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
    this.stop();
  }

  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    if (!this.config.enabled) {
      this.stop();
    }
    return this.config.enabled;
  }

  private cleanTextForSpeech(text: string): string {
    return (
      text
        // Remove markdown-like formatting
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/#{1,6}\s*(.*?)$/gm, "$1")

        // Handle common abbreviations
        .replace(/\bUI\b/g, "User Interface")
        .replace(/\bUX\b/g, "User Experience")
        .replace(/\bAPI\b/g, "A P I")
        .replace(/\bHTML\b/g, "H T M L")
        .replace(/\bCSS\b/g, "C S S")
        .replace(/\bJS\b/g, "JavaScript")

        // Handle technical terms
        .replace(/\bvs\b/g, "versus")
        .replace(/\be\.g\./g, "for example")
        .replace(/\bi\.e\./g, "that is")
        .replace(/\betc\./g, "and so on")

        // Clean up punctuation for better speech flow
        .replace(/([.!?])\s*([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  // Utility method to speak with automatic chunking for long texts
  async speakLongText(text: string, chunkSize: number = 200): Promise<void> {
    if (!this.config.enabled || !text.trim()) return;

    const sentences = this.splitIntoSentences(text);
    let currentChunk = "";

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk.trim()) {
          await this.speak(currentChunk.trim());
          await this.delay(300); // Short pause between chunks
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }

    if (currentChunk.trim()) {
      await this.speak(currentChunk.trim());
    }
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/([.!?]+\s+)/).filter((part) => part.trim().length > 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Static method to check browser compatibility
  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  // Static method to get available voices without creating an instance
  static async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!TTSService.isSupported()) return [];

    return new Promise((resolve) => {
      const synthesis = window.speechSynthesis;
      const getVoices = () => {
        const voices = synthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        }
      };

      if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = getVoices;
      }

      getVoices();
      setTimeout(() => resolve(synthesis.getVoices()), 1000);
    });
  }
}
