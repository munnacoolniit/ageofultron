// Voice Activity Detection Service for automatic speech recognition

interface VADConfig {
  threshold: number; // Volume threshold for voice detection
  debounceTime: number; // Time to wait before stopping listening
  maxListenTime: number; // Maximum continuous listening time
  sampleRate: number; // Audio sample rate
}

interface VADCallbacks {
  onVoiceStart?: () => void;
  onVoiceEnd?: (transcript: string) => void;
  onListening?: (isListening: boolean) => void;
  onError?: (error: string) => void;
}

export class VoiceActivityDetection {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: any = null;
  private isActive = false;
  private isListening = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private maxListenTimer: NodeJS.Timeout | null = null;
  private animationFrame: number | null = null;

  private config: VADConfig;
  private callbacks: VADCallbacks = {};

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      threshold: 0.01, // Voice detection threshold (0-1)
      debounceTime: 2000, // 2 seconds of silence before stopping
      maxListenTime: 10000, // 10 seconds maximum listening
      sampleRate: 44100,
      ...config,
    };

    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize Audio Context for voice detection
      this.audioContext = new (window.AudioContext ||
        // @ts-ignore
        window.webkitAudioContext)();

      // Initialize Speech Recognition
      if (this.isSpeechRecognitionSupported()) {
        // @ts-ignore
        const SpeechRecognition =
          // @ts-ignore
          window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.setupSpeechRecognition();
      }
    } catch (error) {
      console.error("Failed to initialize voice services:", error);
    }
  }

  private setupSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false; // Changed to false for better control
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    let finalTranscript = "";

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let currentFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += transcript;
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      console.log(
        "VAD: Speech result - Final:",
        currentFinal,
        "Interim:",
        interimTranscript
      );

      // If we have a final result, process it immediately
      if (currentFinal.trim()) {
        console.log("VAD: Processing final transcript:", currentFinal.trim());
        this.handleVoiceEnd(currentFinal.trim());
      }
      // Also handle interim results that look complete (end with punctuation or are long enough)
      else if (
        interimTranscript.trim() &&
        interimTranscript.trim().length > 10 &&
        /[.!?]$/.test(interimTranscript.trim())
      ) {
        console.log(
          "VAD: Processing interim transcript as complete:",
          interimTranscript.trim()
        );
        this.handleVoiceEnd(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      this.callbacks.onError?.(event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      if (this.isActive && !this.isListening) {
        // Restart recognition if we're still in active mode
        setTimeout(() => {
          if (this.isActive) {
            this.startVoiceDetection();
          }
        }, 100);
      }
    };
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Voice Activity Detection not supported");
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio analysis
      if (this.audioContext && this.mediaStream) {
        const source = this.audioContext.createMediaStreamSource(
          this.mediaStream
        );
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        source.connect(this.analyser);

        this.isActive = true;
        this.startVoiceDetection();
        this.callbacks.onListening?.(true);
      }
    } catch (error) {
      console.error("Failed to start voice detection:", error);
      this.callbacks.onError?.("Failed to access microphone");
      throw error;
    }
  }

  stop(): void {
    this.isActive = false;
    this.stopListening();
    this.cleanup();
    this.callbacks.onListening?.(false);
  }

  private startVoiceDetection(): void {
    if (!this.analyser || !this.isActive) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectVoice = () => {
      if (!this.isActive || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalizedVolume = average / 255;

      // Voice detected
      if (normalizedVolume > this.config.threshold && !this.isListening) {
        this.startListening();
      }

      // Continue monitoring
      this.animationFrame = requestAnimationFrame(detectVoice);
    };

    detectVoice();
  }

  private startListening(): void {
    if (this.isListening || !this.recognition) return;

    console.log("VAD: Starting speech recognition...");
    this.isListening = true;
    this.callbacks.onVoiceStart?.();

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      this.stopListening();
      return;
    }

    // Set maximum listening time
    this.maxListenTimer = setTimeout(() => {
      console.log("VAD: Max listen time reached, stopping...");
      if (this.isListening) {
        this.stopListening();
        // Force end with empty transcript if no speech was captured
        this.handleVoiceEnd("");
      }
    }, this.config.maxListenTime);
  }

  private stopListening(): void {
    if (!this.isListening) return;

    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Recognition might already be stopped
      }
    }

    if (this.maxListenTimer) {
      clearTimeout(this.maxListenTimer);
      this.maxListenTimer = null;
    }
  }

  private handleVoiceEnd(transcript: string): void {
    console.log("VAD: Handling voice end with transcript:", transcript);
    this.stopListening();

    // Clear any existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Process immediately if we have a transcript
    if (transcript.trim()) {
      console.log("VAD: Sending transcript to callback:", transcript.trim());
      this.callbacks.onVoiceEnd?.(transcript.trim());
    }

    // Restart voice detection after processing
    setTimeout(() => {
      if (this.isActive) {
        console.log("VAD: Restarting voice detection...");
        this.startVoiceDetection();
      }
    }, 2000); // Wait 2 seconds before restarting
  }

  private cleanup(): void {
    // Stop animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.maxListenTimer) {
      clearTimeout(this.maxListenTimer);
      this.maxListenTimer = null;
    }

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore errors during cleanup
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

  // Public methods for setting callbacks
  onVoiceStart(callback: () => void): void {
    this.callbacks.onVoiceStart = callback;
  }

  onVoiceEnd(callback: (transcript: string) => void): void {
    this.callbacks.onVoiceEnd = callback;
  }

  onListening(callback: (isListening: boolean) => void): void {
    this.callbacks.onListening = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
  }

  // Getters
  getIsActive(): boolean {
    return this.isActive;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Configuration methods
  setThreshold(threshold: number): void {
    this.config.threshold = Math.max(0, Math.min(1, threshold));
  }

  setDebounceTime(time: number): void {
    this.config.debounceTime = Math.max(500, Math.min(10000, time));
  }

  getConfig(): VADConfig {
    return { ...this.config };
  }

  // Static methods
  static isSupported(): boolean {
    // @ts-ignore
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
      "AudioContext" in window &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  private isSupported(): boolean {
    return VoiceActivityDetection.isSupported();
  }

  private isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  // Method to test microphone access
  static async testMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone access test failed:", error);
      return false;
    }
  }

  // Method to get available audio input devices
  static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.error("Failed to get audio devices:", error);
      return [];
    }
  }
}
