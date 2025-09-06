import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PageContent,
  EducationalExplanation,
  TutorPersonality,
  AIServiceConfig,
} from "../Types";

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private personality: TutorPersonality;
  private config: AIServiceConfig;

  constructor(
    apiKey: string,
    personality?: Partial<TutorPersonality>,
    config?: Partial<AIServiceConfig>
  ) {
    this.personality = {
      name: "UpGrad AI Tutor",
      style: "friendly",
      expertise: ["programming", "data-science", "business", "design"],
      greetingMessage:
        "Hi! I'm your UpGrad AI learning companion. I'm here to help you understand this content better!",
      ...personality,
    };

    this.config = {
      provider: "gemini",
      model: "gemini-1.5-flash",
      maxTokens: 1000,
      temperature: 0.7,
      ...config,
    };

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model || "gemini-1.5-flash",
    });
  }

  async analyzeContent(content: PageContent): Promise<EducationalExplanation> {
    try {
      const prompt = this.buildContentAnalysisPrompt(content);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseEducationalResponse(text, content);
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getFallbackExplanation(content);
    }
  }

  async explainPage(context: PageContent): Promise<string> {
    try {
      const prompt = this.buildPageExplanationPrompt(context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getFallbackPageExplanation(context);
    }
  }

  async generateResponse(
    question: string,
    context: PageContent
  ): Promise<string> {
    try {
      const prompt = this.buildConversationPrompt(question, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getFallbackResponse(question);
    }
  }

  getGreeting(): string {
    return this.personality.greetingMessage;
  }

  private buildContentAnalysisPrompt(content: PageContent): string {
    const personalityContext = this.getPersonalityContext();

    return `${personalityContext}

CONTENT TO ANALYZE:
Title: ${content.title}
Page Type: ${content.pageType}
Topics: ${content.topics.join(", ")}
Difficulty: ${content.difficulty}
Main Content: ${content.mainContent.substring(0, 2000)}
${content.courseContext ? `Course Context: ${content.courseContext}` : ""}

TASK: Analyze this educational content and provide a structured response in the following JSON format:
{
  "summary": "A friendly, engaging 2-3 sentence summary explaining what this content covers and why it's valuable",
  "keyPoints": ["3-4 most important concepts or takeaways"],
  "examples": ["2-3 practical examples or analogies to help understand the concepts"],
  "suggestedQuestions": ["4-5 questions students might ask about this content"],
  "nextSteps": ["3-4 actionable next steps for learning"],
  "relatedTopics": ["3-4 related topics to explore"]
}

Make the response conversational, encouraging, and appropriate for ${
      content.difficulty
    } level learners. Focus on practical understanding and real-world applications.`;
  }

  private buildConversationPrompt(
    question: string,
    context: PageContent
  ): string {
    const personalityContext = this.getPersonalityContext();

    const prompt = `${personalityContext}

CURRENT LEARNING CONTEXT:
- Page: ${context.title}
- Topics: ${context.topics.join(", ")}
- Level: ${context.difficulty}
- Type: ${context.pageType}
- Content Preview: ${context.mainContent.substring(0, 500)}...

STUDENT QUESTION: "${question}"

Provide a helpful, encouraging response that:
1. Directly answers their question
2. Relates to the current page content shown above
3. Uses simple language appropriate for ${context.difficulty} learners
4. Includes practical examples when relevant
5. Encourages further learning

Keep the response conversational and under 200 words.`;

    console.log("🤖 Gemini Conversation Prompt:");
    console.log("  Question:", question);
    console.log("  Context Title:", context.title);
    console.log("  Context Topics:", context.topics);
    console.log("  Content Length:", context.mainContent.length);
    console.log("  Full Prompt Length:", prompt.length);

    return prompt;
  }

  private buildPageExplanationPrompt(context: PageContent): string {
    const personalityContext = this.getPersonalityContext();

    return `${personalityContext}

CURRENT PAGE CONTENT:
Title: ${context.title}
Page Type: ${context.pageType}
Topics: ${context.topics.join(", ")}
Difficulty: ${context.difficulty}
Main Content: ${context.mainContent.substring(0, 2000)}
${context.courseContext ? `Course Context: ${context.courseContext}` : ""}

TASK: The user wants you to "Explain me this page". Provide an intelligent, engaging explanation of this page content that:

1. Gives a clear overview of what this page is about
2. Explains the key concepts in simple, understandable terms
3. Highlights why this content is important or valuable to learn
4. Makes connections to real-world applications where relevant
5. Uses an encouraging, friendly tone appropriate for ${
      context.difficulty
    } level learners

Keep the explanation conversational, informative, and around 150-200 words. Focus on helping the user understand the essence and value of this content.`;
  }

  private getPersonalityContext(): string {
    const styleDescriptions = {
      friendly:
        "You are a friendly, approachable tutor who uses casual language and encourages students with enthusiasm.",
      professional:
        "You are a professional educator who provides structured, comprehensive explanations with expertise.",
      encouraging:
        "You are an encouraging mentor who motivates students and celebrates their learning journey.",
      casual:
        "You are a casual, relatable tutor who explains things in simple, everyday terms.",
    };

    return `You are ${
      this.personality.name
    }, an AI learning assistant with expertise in ${this.personality.expertise.join(
      ", "
    )}.

PERSONALITY: ${styleDescriptions[this.personality.style]}

TEACHING APPROACH:
- Break down complex concepts into digestible parts
- Use analogies and real-world examples
- Encourage questions and curiosity
- Provide practical, actionable advice
- Adapt explanations to the student's level`;
  }

  private parseEducationalResponse(
    text: string,
    content: PageContent
  ): EducationalExplanation {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || this.generateFallbackSummary(content),
          keyPoints: parsed.keyPoints || [],
          examples: parsed.examples || [],
          suggestedQuestions: parsed.suggestedQuestions || [],
          nextSteps: parsed.nextSteps || [],
          relatedTopics: parsed.relatedTopics || [],
        };
      }
    } catch (error) {
      console.warn("Failed to parse JSON response, using text parsing");
    }

    // Fallback: parse structured text response
    return this.parseTextResponse(text, content);
  }

  private parseTextResponse(
    text: string,
    content: PageContent
  ): EducationalExplanation {
    const lines = text.split("\n").filter((line) => line.trim());

    return {
      summary: this.extractSummaryFromText(text, content),
      keyPoints: this.extractListFromText(text, [
        "key points",
        "important",
        "main",
      ]),
      examples: this.extractListFromText(text, [
        "example",
        "for instance",
        "consider",
      ]),
      suggestedQuestions: this.extractListFromText(text, [
        "question",
        "ask",
        "wonder",
      ]),
      nextSteps: this.extractListFromText(text, [
        "next",
        "step",
        "action",
        "practice",
      ]),
      relatedTopics: this.extractListFromText(text, [
        "related",
        "similar",
        "also",
      ]),
    };
  }

  private extractSummaryFromText(text: string, content: PageContent): string {
    // Extract first paragraph or first few sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join(". ").trim();

    return summary || this.generateFallbackSummary(content);
  }

  private extractListFromText(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
        const cleaned = trimmed.replace(/^[-*•]\s|\d+\.\s/, "").trim();
        if (cleaned.length > 10) {
          items.push(cleaned);
        }
      }
    }

    return items.slice(0, 5); // Limit to 5 items
  }

  private generateFallbackSummary(content: PageContent): string {
    return `This ${content.difficulty} ${
      content.pageType
    } covers ${content.topics.join(
      " and "
    )}. I'll help you understand the key concepts and apply them practically!`;
  }

  private getFallbackExplanation(content: PageContent): EducationalExplanation {
    return {
      summary: this.generateFallbackSummary(content),
      keyPoints: [
        "Understanding the fundamentals is crucial for success",
        "Practice with real examples helps solidify concepts",
        "Breaking complex topics into smaller parts makes them manageable",
      ],
      examples: [
        "Consider real-world applications of these concepts",
        "Think about how professionals use these skills daily",
      ],
      suggestedQuestions: [
        "How can I apply this in practice?",
        "What are some real-world examples?",
        "What should I learn next?",
        "Can you explain this concept differently?",
      ],
      nextSteps: [
        "Practice with hands-on examples",
        "Explore related topics",
        "Join learning communities",
      ],
      relatedTopics: content.topics.slice(1, 4),
    };
  }

  private getFallbackResponse(question: string): string {
    return `That's a great question! I'm having trouble accessing my knowledge base right now, but I'd love to help you understand this better. Could you try rephrasing your question or asking about a specific aspect you'd like to explore?`;
  }

  private getFallbackPageExplanation(context: PageContent): string {
    return `This ${context.difficulty} ${
      context.pageType
    } covers ${context.topics.join(
      " and "
    )}. While I'm having trouble accessing my full knowledge base right now, I can see this content focuses on important concepts that will help you build your understanding. Feel free to ask me specific questions about any part of this content that interests you!`;
  }

  // Method to test API connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent(
        "Hello, please respond with 'Connection successful'"
      );
      const response = await result.response;
      const text = response.text();
      return (
        text.toLowerCase().includes("connection successful") || text.length > 0
      );
    } catch (error) {
      console.error("Gemini connection test failed:", error);
      return false;
    }
  }

  // Method to get API usage info
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  // Static method to create different personalities
  static createPersonality(
    type: "friendly" | "professional" | "encouraging"
  ): TutorPersonality {
    const personalities = {
      friendly: {
        name: "Alex",
        style: "friendly" as const,
        expertise: ["programming", "data-science", "business"],
        greetingMessage:
          "Hey there! I'm Alex, and I'm excited to learn with you today! 😊",
      },
      professional: {
        name: "Dr. Morgan",
        style: "professional" as const,
        expertise: ["business", "data-science", "cybersecurity"],
        greetingMessage:
          "Good day. I'm Dr. Morgan, your educational assistant. I'm here to provide comprehensive guidance on this content.",
      },
      encouraging: {
        name: "Sam",
        style: "encouraging" as const,
        expertise: ["design", "programming", "digital-marketing"],
        greetingMessage:
          "Hi! I'm Sam, and I believe you can master anything you set your mind to! Let's tackle this together! 🌟",
      },
    };

    return personalities[type];
  }
}
