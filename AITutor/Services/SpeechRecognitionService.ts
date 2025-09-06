// Speech Recognition Service using Web Speech API

interface SpeechRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onNoMatch?: () => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private config: SpeechRecognitionConfig;
  private callbacks: SpeechRecognitionCallbacks = {};

  constructor(config: Partial<SpeechRecognitionConfig> = {}) {
    this.config = {
      language: "en-US",
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      ...config,
    };

    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    // @ts-ignore - Web Speech API types
    const SpeechRecognition =
      // @ts-ignore
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.setupRecognitionEvents();
    this.configureRecognition();
  }

  private configureRecognition(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  private setupRecognitionEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Call callback with the most recent transcript
      const currentTranscript = finalTranscript || interimTranscript;
      const isFinal = finalTranscript.length > 0;

      if (currentTranscript.trim()) {
        this.callbacks.onResult?.(currentTranscript.trim(), isFinal);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      const errorMessage = this.getErrorMessage(event.error);
      this.callbacks.onError?.(errorMessage);
    };

    this.recognition.onnomatch = () => {
      this.callbacks.onNoMatch?.();
    };
  }

  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      "no-speech": "No speech was detected. Please try again.",
      "audio-capture": "Audio capture failed. Please check your microphone.",
      "not-allowed":
        "Microphone access was denied. Please allow microphone access.",
      network: "Network error occurred. Please check your connection.",
      "service-not-allowed": "Speech recognition service is not allowed.",
      "bad-grammar": "Grammar error in speech recognition.",
      "language-not-supported": "Language not supported.",
    };

    return errorMessages[error] || `Speech recognition error: ${error}`;
  }

  // Public methods
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Speech Recognition not supported"));
        return;
      }

      if (this.isListening) {
        resolve();
        return;
      }

      // Set up one-time callbacks for this session
      const originalOnStart = this.callbacks.onStart;
      const originalOnError = this.callbacks.onError;

      this.callbacks.onStart = () => {
        originalOnStart?.();
        resolve();
      };

      this.callbacks.onError = (error) => {
        originalOnError?.(error);
        reject(new Error(error));
      };

      try {
        this.recognition?.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  // Getters
  getIsListening(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  // Configuration methods
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  setContinuous(continuous: boolean): void {
    this.config.continuous = continuous;
    if (this.recognition) {
      this.recognition.continuous = continuous;
    }
  }

  setInterimResults(interimResults: boolean): void {
    this.config.interimResults = interimResults;
    if (this.recognition) {
      this.recognition.interimResults = interimResults;
    }
  }

  // Event handlers
  onStart(callback: () => void): void {
    this.callbacks.onStart = callback;
  }

  onResult(callback: (transcript: string, isFinal: boolean) => void): void {
    this.callbacks.onResult = callback;
  }

  onEnd(callback: () => void): void {
    this.callbacks.onEnd = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
  }

  onNoMatch(callback: () => void): void {
    this.callbacks.onNoMatch = callback;
  }

  // Utility methods
  getConfig(): SpeechRecognitionConfig {
    return { ...this.config };
  }

  getSupportedLanguages(): string[] {
    // Common supported languages - actual support varies by browser
    return [
      "en-US", // English (US)
      "en-GB", // English (UK)
      "es-ES", // Spanish (Spain)
      "es-MX", // Spanish (Mexico)
      "fr-FR", // French
      "de-DE", // German
      "it-IT", // Italian
      "pt-BR", // Portuguese (Brazil)
      "ru-RU", // Russian
      "ja-JP", // Japanese
      "ko-KR", // Korean
      "zh-CN", // Chinese (Simplified)
      "zh-TW", // Chinese (Traditional)
      "hi-IN", // Hindi
      "ar-SA", // Arabic
    ];
  }

  // Static method to check browser support
  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  // Method to request microphone permission
  async requestPermission(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately as we just wanted to request permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }

  // Enhanced method for single question capture
  async captureQuestion(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Speech recognition not supported"));
        return;
      }

      let finalResult = "";
      let timeout: NodeJS.Timeout;

      // Set up temporary callbacks for this capture session
      this.onResult((transcript, isFinal) => {
        if (isFinal) {
          finalResult = transcript;
          clearTimeout(timeout);
          this.stop();
        }
      });

      this.onEnd(() => {
        if (finalResult.trim()) {
          resolve(finalResult.trim());
        } else {
          reject(new Error("No speech detected"));
        }
      });

      this.onError((error) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      // Auto-stop after 10 seconds of listening
      timeout = setTimeout(() => {
        this.stop();
        if (finalResult.trim()) {
          resolve(finalResult.trim());
        } else {
          reject(new Error("Speech recognition timeout"));
        }
      }, 10000);

      // Start listening
      this.start().catch(reject);
    });
  }
}
