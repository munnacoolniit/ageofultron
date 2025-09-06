// Types and interfaces for AI Tutor system

export interface PageContent {
  title: string;
  headings: string[];
  mainContent: string;
  topics: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  courseContext?: string;
  pageType: "course" | "program" | "tutorial" | "general";
}

export interface EducationalExplanation {
  summary: string;
  keyPoints: string[];
  examples: string[];
  suggestedQuestions: string[];
  nextSteps: string[];
  relatedTopics: string[];
}

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AITutorState {
  isVisible: boolean;
  isLoading: boolean;
  currentExplanation: EducationalExplanation | null;
  chatHistory: ChatMessage[];
  avatarState: "idle" | "speaking" | "listening" | "thinking";
  voiceEnabled: boolean;
  speechRecognitionEnabled: boolean;
  isListening: boolean;
  currentTopic: string | null;
  voiceMuted: boolean;
}

export interface TutorPersonality {
  name: string;
  style: "friendly" | "professional" | "encouraging" | "casual";
  expertise: string[];
  greetingMessage: string;
}

export interface LearningContext {
  userLevel: "beginner" | "intermediate" | "advanced";
  preferredLearningStyle: "visual" | "auditory" | "kinesthetic" | "mixed";
  previousTopics: string[];
  currentGoals: string[];
}

export interface AIServiceConfig {
  provider: "mock" | "huggingface" | "gemini" | "custom";
  apiKey?: string;
  model?: string;
  maxTokens: number;
  temperature: number;
}

export interface TTSConfig {
  enabled: boolean;
  voice?: SpeechSynthesisVoice;
  rate: number;
  pitch: number;
  volume: number;
}

export interface ContentExtractionOptions {
  includeImages: boolean;
  includeLinks: boolean;
  maxContentLength: number;
  prioritySelectors: string[];
}

// Error types
export class AITutorError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "AITutorError";
  }
}

// Event types for component communication
export interface AITutorEvents {
  onToggle: (isVisible: boolean) => void;
  onContentAnalyzed: (explanation: EducationalExplanation) => void;
  onMessageSent: (message: ChatMessage) => void;
  onVoiceToggle: (enabled: boolean) => void;
  onError: (error: AITutorError) => void;
}
