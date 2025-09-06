// Simplified Voice Input Service - More reliable than full VAD

interface SimpleVoiceConfig {
  language: string;
  timeout: number; // Auto-stop after this time
  silenceTimeout: number; // Stop after silence
}

interface VoiceInputCallbacks {
  onStart?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onComplete?: (finalText: string) => void;
  onError?: (error: string) => void;
  onStop?: () => void;
}

export class SimpleVoiceInput {
  private recognition: any = null;
  private isListening = false;
  private config: SimpleVoiceConfig;
  private callbacks: VoiceInputCallbacks = {};
  private timeoutTimer: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private finalTranscript = "";

  constructor(config: Partial<SimpleVoiceConfig> = {}) {
    this.config = {
      language: "en-US",
      timeout: 8000, // 8 seconds max
      silenceTimeout: 2000, // 2 seconds silence
      ...config,
    };

    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) return;

    // @ts-ignore
    const SpeechRecognition =
      // @ts-ignore
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.setupEvents();
  }

  private setupEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log("SimpleVoice: Recognition started");
      this.isListening = true;
      this.finalTranscript = "";
      this.callbacks.onStart?.();
      this.startTimers();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let newFinalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalText += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update final transcript
      if (newFinalText) {
        this.finalTranscript += newFinalText;
        console.log("SimpleVoice: Final text received:", newFinalText);
      }

      // Send current transcript to callback
      const currentText = this.finalTranscript + interimTranscript;
      this.callbacks.onTranscript?.(currentText.trim(), !!newFinalText);

      // Reset silence timer when we get new speech
      if (newFinalText || interimTranscript) {
        this.resetSilenceTimer();
      }

      // If we have enough final text, auto-complete
      if (this.finalTranscript.trim().length > 5) {
        this.complete();
      }
    };

    this.recognition.onend = () => {
      console.log("SimpleVoice: Recognition ended");
      this.complete();
    };

    this.recognition.onerror = (event: any) => {
      console.error("SimpleVoice: Recognition error:", event.error);
      this.isListening = false;
      this.clearTimers();
      this.callbacks.onError?.(event.error);
    };
  }

  private startTimers(): void {
    // Overall timeout
    this.timeoutTimer = setTimeout(() => {
      console.log("SimpleVoice: Timeout reached");
      this.stop();
    }, this.config.timeout);

    // Silence detection timer
    this.resetSilenceTimer();
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      console.log("SimpleVoice: Silence timeout reached");
      this.complete();
    }, this.config.silenceTimeout);
  }

  private clearTimers(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private complete(): void {
    if (!this.isListening) return;

    console.log(
      "SimpleVoice: Completing with transcript:",
      this.finalTranscript
    );
    this.isListening = false;
    this.clearTimers();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore stop errors
      }
    }

    const result = this.finalTranscript.trim();
    if (result) {
      this.callbacks.onComplete?.(result);
    }

    this.callbacks.onStop?.();

    // Auto-restart listening after 3 seconds for continuous conversation
    setTimeout(() => {
      if (!this.isListening) {
        console.log("SimpleVoice: Auto-restarting for next question...");
        this.start().catch(console.error);
      }
    }, 3000);
  }

  // Public methods
  async start(): Promise<void> {
    if (!this.isSupported() || this.isListening) return;

    console.log("SimpleVoice: Starting voice input...");

    try {
      this.recognition.start();
    } catch (error) {
      console.error("SimpleVoice: Failed to start:", error);
      throw error;
    }
  }

  stop(): void {
    console.log("SimpleVoice: Stopping voice input...");
    this.complete();
  }

  abort(): void {
    console.log("SimpleVoice: Aborting voice input...");
    this.isListening = false;
    this.clearTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        // Ignore abort errors
      }
    }

    this.callbacks.onStop?.();
  }

  // Getters
  getIsListening(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    return SimpleVoiceInput.isSupported();
  }

  // Callbacks
  onStart(callback: () => void): void {
    this.callbacks.onStart = callback;
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.callbacks.onTranscript = callback;
  }

  onComplete(callback: (finalText: string) => void): void {
    this.callbacks.onComplete = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
  }

  onStop(callback: () => void): void {
    this.callbacks.onStop = callback;
  }

  // Static methods
  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  static async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }
}
