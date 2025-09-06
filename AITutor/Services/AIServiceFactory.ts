import { GeminiAIService } from "./GeminiAIService";
import { MockAIService } from "./MockAIService";
import { TutorPersonality, AIServiceConfig } from "../Types";

export type AIServiceType = "gemini" | "mock";

export interface AIServiceInterface {
  analyzeContent(content: any): Promise<any>;
  generateResponse(question: string, context: any): Promise<string>;
  getGreeting(): string;
}

export class AIServiceFactory {
  static create(
    type: AIServiceType = "gemini",
    personality?: Partial<TutorPersonality>,
    config?: Partial<AIServiceConfig>
  ): AIServiceInterface {
    switch (type) {
      case "gemini":
        // Try to create Gemini service first
        // @ts-ignore
        const geminiService = GeminiAIService.create(personality, config);
        if (geminiService) {
          console.log("✅ Using Gemini AI Service");
          return geminiService;
        }

        // Fallback to mock service if Gemini is not configured
        console.warn(
          "⚠️ Gemini API not configured, falling back to Mock AI Service"
        );
        return new MockAIService(personality, config);

      case "mock":
        console.log("🎭 Using Mock AI Service");
        return new MockAIService(personality, config);

      default:
        throw new Error(`Unsupported AI service type: ${type}`);
    }
  }

  static isGeminiConfigured(): boolean {
    // @ts-ignore
    return GeminiAIService.isConfigured();
  }

  static getRecommendedService(): AIServiceType {
    // @ts-ignore
    return GeminiAIService.isConfigured() ? "gemini" : "mock";
  }
}
