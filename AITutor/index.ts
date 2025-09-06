// AI Tutor Components and Services
export { default as AITutorModal } from "./Modal/AITutorModal";
export { default as AIAvatar } from "./Avatar/AIAvatar";
export { default as ChatMessage } from "./Chat/ChatMessage";
export { default as ChatInput } from "./Chat/ChatInput";

// Services
export { ContentExtractor } from "./Services/ContentExtractor";
export { MockAIService } from "./Services/MockAIService";
export { GeminiAIService } from "./Services/GeminiAIService";
export { TTSService } from "./Services/TTSService";
export { SpeechRecognitionService } from "./Services/SpeechRecognitionService";
export { VoiceActivityDetection } from "./Services/VoiceActivityDetection";
export { SimpleVoiceInput } from "./Services/SimpleVoiceInput";
export { InterruptibleVoiceInput } from "./Services/InterruptibleVoiceInput";

// Types
export type {
  AITutorState,
  PageContent,
  EducationalExplanation,
  ChatMessage as ChatMessageType,
  TutorPersonality,
  LearningContext,
  AIServiceConfig,
  TTSConfig,
  ContentExtractionOptions,
  AITutorEvents,
} from "./Types";

// Error classes
export { AITutorError } from "./Types";
