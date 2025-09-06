// Interruptible Voice Input - AI stops when user starts speaking

interface InterruptibleVoiceConfig {
  language: string;
  silenceTimeout: number; // Time to wait before processing
  voiceThreshold: number; // Volume threshold for voice detection
  interruptSensitivity: number; // How quickly to interrupt AI
}

interface InterruptibleVoiceCallbacks {
  onUserSpeakingDetected?: () => void; // Called immediately when user starts speaking
  onUserSpeechStart?: () => void; // Called when we start listening to user
  onUserSpeechEnd?: (transcript: string) => void; // Called with final transcript
  onError?: (error: string) => void;
  onStatusChange?: (
    status: "idle" | "detecting" | "listening" | "processing"
  ) => void;
}

export class InterruptibleVoiceInput {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: any = null;

  private isActive = false;
  private isListening = false;
  private isProcessing = false;
  private currentStatus: "idle" | "detecting" | "listening" | "processing" =
    "idle";

  private config: InterruptibleVoiceConfig;
  private callbacks: InterruptibleVoiceCallbacks = {};

  private silenceTimer: NodeJS.Timeout | null = null;
  private animationFrame: number | null = null;
  private finalTranscript = "";

  constructor(config: Partial<InterruptibleVoiceConfig> = {}) {
    this.config = {
      language: "en-US",
      silenceTimeout: 2000, // 2 seconds
      voiceThreshold: 0.02, // Slightly higher for better detection
      interruptSensitivity: 0.015, // Lower threshold for interrupting
      ...config,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize Speech Recognition
      if (this.isSpeechRecognitionSupported()) {
        // @ts-ignore
        const SpeechRecognition =
          // @ts-ignore
          window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.setupSpeechRecognition();
      }

      // Initialize Audio Context for interrupt detection
      this.audioContext = new (window.AudioContext ||
        // @ts-ignore
        window.webkitAudioContext)();
    } catch (error) {
      console.error("Failed to initialize voice services:", error);
    }
  }

  private setupSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log("InterruptibleVoice: Speech recognition started");
      this.isListening = true;
      this.updateStatus("listening");
      this.finalTranscript = "";
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

      if (newFinalText) {
        this.finalTranscript += newFinalText;
        console.log("InterruptibleVoice: Final text:", newFinalText);
      }

      // Reset silence timer on any speech
      this.resetSilenceTimer();

      console.log(
        "InterruptibleVoice: Current transcript:",
        this.finalTranscript + interimTranscript
      );
    };

    this.recognition.onend = () => {
      console.log("InterruptibleVoice: Recognition ended");
      this.processResult();
    };

    this.recognition.onerror = (event: any) => {
      console.error("InterruptibleVoice: Recognition error:", event.error);
      this.callbacks.onError?.(event.error);
      this.reset();

      // Don't restart if permission was denied
      if (event.error === "not-allowed") {
        this.stop();
      }
    };
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      console.log("InterruptibleVoice: Starting system...");

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio analysis for interrupt detection
      if (this.audioContext && this.mediaStream) {
        const source = this.audioContext.createMediaStreamSource(
          this.mediaStream
        );
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        source.connect(this.analyser);

        this.isActive = true;
        this.updateStatus("detecting");
        this.startInterruptDetection();
      }
    } catch (error) {
      console.error("Failed to start interruptible voice input:", error);
      this.callbacks.onError?.("Failed to access microphone");
      throw error;
    }
  }

  stop(): void {
    console.log("InterruptibleVoice: Stopping system...");
    this.isActive = false;
    this.cleanup();
    this.updateStatus("idle");
  }

  // Method to be called when AI starts speaking (so we can detect interrupts)
  setAISpeaking(speaking: boolean): void {
    if (speaking) {
      console.log(
        "InterruptibleVoice: AI started speaking - monitoring for interrupts"
      );
      this.updateStatus("detecting");
    }
  }

  private startInterruptDetection(): void {
    if (!this.analyser || !this.isActive) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectInterrupt = () => {
      if (!this.isActive || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalizedVolume = average / 255;

      // User started speaking - interrupt AI and start listening
      if (
        normalizedVolume > this.config.interruptSensitivity &&
        !this.isListening &&
        !this.isProcessing
      ) {
        console.log(
          "InterruptibleVoice: User speech detected - interrupting AI"
        );
        this.callbacks.onUserSpeakingDetected?.(); // Tell AI to stop
        this.startUserListening();
        return;
      }

      // Continue monitoring
      this.animationFrame = requestAnimationFrame(detectInterrupt);
    };

    detectInterrupt();
  }

  private startUserListening(): void {
    if (this.isListening || !this.recognition) return;

    console.log("InterruptibleVoice: Starting to listen to user...");
    this.callbacks.onUserSpeechStart?.();

    try {
      this.recognition.start();
      this.resetSilenceTimer();
    } catch (error) {
      console.error("Failed to start user listening:", error);
      this.reset();
    }
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      console.log("InterruptibleVoice: Silence timeout - processing result");
      this.processResult();
    }, this.config.silenceTimeout);
  }

  private processResult(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.isListening = false;
    this.updateStatus("processing");

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore stop errors
      }
    }

    const result = this.finalTranscript.trim();
    console.log("InterruptibleVoice: Processing final result:", result);

    if (result) {
      this.callbacks.onUserSpeechEnd?.(result);
    }

    // Reset for next interaction
    setTimeout(() => {
      this.reset();
      if (this.isActive) {
        console.log("InterruptibleVoice: Restarting interrupt detection...");
        this.startInterruptDetection();
      }
    }, 2000); // Increased delay to prevent rapid restarts
  }

  private reset(): void {
    this.isListening = false;
    this.isProcessing = false;
    this.finalTranscript = "";
    this.updateStatus(this.isActive ? "detecting" : "idle");

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private updateStatus(status: typeof this.currentStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  private cleanup(): void {
    // Stop animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Clear timers
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Close media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Public callback setters
  onUserSpeakingDetected(callback: () => void): void {
    this.callbacks.onUserSpeakingDetected = callback;
  }

  onUserSpeechStart(callback: () => void): void {
    this.callbacks.onUserSpeechStart = callback;
  }

  onUserSpeechEnd(callback: (transcript: string) => void): void {
    this.callbacks.onUserSpeechEnd = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
  }

  onStatusChange(
    callback: (
      status: "idle" | "detecting" | "listening" | "processing"
    ) => void
  ): void {
    this.callbacks.onStatusChange = callback;
  }

  // Getters
  getIsActive(): boolean {
    return this.isActive;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getCurrentStatus(): string {
    return this.currentStatus;
  }

  // Configuration
  setVoiceThreshold(threshold: number): void {
    this.config.voiceThreshold = Math.max(0, Math.min(1, threshold));
  }

  setInterruptSensitivity(sensitivity: number): void {
    this.config.interruptSensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  // Static methods
  static isSupported(): boolean {
    // @ts-ignore
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
      ("AudioContext" in window || "webkitAudioContext" in window) &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
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

  private isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }
}
