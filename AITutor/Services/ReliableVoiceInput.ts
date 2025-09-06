// Reliable Voice Input - Simple, no loops, works properly

interface ReliableVoiceConfig {
  language: string;
  maxDuration: number;
}

interface ReliableVoiceCallbacks {
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onSpeechResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export class ReliableVoiceInput {
  private recognition: any = null;
  private isListening = false;
  private isEnabled = true;
  private config: ReliableVoiceConfig;
  private callbacks: ReliableVoiceCallbacks = {};
  private timeoutTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ReliableVoiceConfig> = {}) {
    this.config = {
      language: "en-US",
      maxDuration: 10000, // 10 seconds max
      ...config,
    };

    this.initialize();
  }

  private initialize(): void {
    if (!ReliableVoiceInput.isSupported()) {
      console.warn("Speech Recognition not supported");
      return;
    }

    try {
      // @ts-ignore
      const SpeechRecognition =
        // @ts-ignore
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error);
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    // Simple configuration for reliability
    this.recognition.continuous = false;
    this.recognition.interimResults = false; // Only final results
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log("ReliableVoice: Started listening");
      this.isListening = true;
      this.callbacks.onListeningStart?.();
      this.startTimeout();
    };

    this.recognition.onresult = (event: any) => {
      console.log("ReliableVoice: Got result");

      // Get the final transcript
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      console.log("ReliableVoice: Final transcript:", finalTranscript);

      if (finalTranscript.trim()) {
        this.handleResult(finalTranscript.trim());
      }
    };

    this.recognition.onend = () => {
      console.log("ReliableVoice: Recognition ended");
      this.cleanup();
    };

    this.recognition.onerror = (event: any) => {
      console.error("ReliableVoice: Error:", event.error);
      this.handleError(event.error);
    };
  }

  private startTimeout(): void {
    this.timeoutTimer = setTimeout(() => {
      console.log("ReliableVoice: Timeout reached, stopping");
      this.stop();
    }, this.config.maxDuration);
  }

  private cleanup(): void {
    this.isListening = false;
    this.callbacks.onListeningEnd?.();

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private handleResult(transcript: string): void {
    console.log("ReliableVoice: Handling result:", transcript);
    this.cleanup();
    this.callbacks.onSpeechResult?.(transcript);
  }

  private handleError(error: string): void {
    console.error("ReliableVoice: Handling error:", error);
    this.cleanup();

    if (error === "not-allowed") {
      this.isEnabled = false;
      this.callbacks.onError?.(
        "Microphone access denied. Please enable microphone permissions in your browser settings."
      );
    } else if (error === "no-speech") {
      this.callbacks.onError?.(
        "No speech detected. Please try speaking louder or closer to the microphone."
      );
    } else {
      this.callbacks.onError?.(error);
    }
  }

  // Public methods
  async startListening(): Promise<void> {
    if (
      !this.isEnabled ||
      !ReliableVoiceInput.isSupported() ||
      this.isListening
    ) {
      console.log(
        "ReliableVoice: Cannot start - disabled, not supported, or already listening"
      );
      return;
    }

    console.log("ReliableVoice: Starting listening session");

    try {
      this.recognition?.start();
    } catch (error) {
      console.error("ReliableVoice: Failed to start:", error);
      this.callbacks.onError?.("Failed to start voice recognition");
    }
  }

  stop(): void {
    if (!this.isListening) return;

    console.log("ReliableVoice: Stopping");
    try {
      this.recognition?.stop();
    } catch (error) {
      console.log("ReliableVoice: Stop error (normal):", error);
    }
  }

  abort(): void {
    console.log("ReliableVoice: Aborting");
    this.cleanup();

    try {
      this.recognition?.abort();
    } catch (error) {
      console.log("ReliableVoice: Abort error (normal):", error);
    }
  }

  // State methods
  enable(): void {
    console.log("ReliableVoice: Enabled");
    this.isEnabled = true;
  }

  disable(): void {
    console.log("ReliableVoice: Disabled");
    this.isEnabled = false;
    this.stop();
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  // Callback setters
  onListeningStart(callback: () => void): void {
    this.callbacks.onListeningStart = callback;
  }

  onListeningEnd(callback: () => void): void {
    this.callbacks.onListeningEnd = callback;
  }

  onSpeechResult(callback: (transcript: string) => void): void {
    this.callbacks.onSpeechResult = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
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
      return false;
    }
  }
}
