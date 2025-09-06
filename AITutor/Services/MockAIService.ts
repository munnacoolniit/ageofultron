import {
  PageContent,
  EducationalExplanation,
  TutorPersonality,
  AIServiceConfig,
} from "../Types";

export class MockAIService {
  private personality: TutorPersonality = {
    name: "Alex",
    style: "friendly",
    expertise: ["programming", "data-science", "business", "design"],
    greetingMessage:
      "Hi! I'm Alex, your AI learning companion. I'm here to help you understand this content better!",
  };

  private config: AIServiceConfig = {
    provider: "mock",
    maxTokens: 500,
    temperature: 0.7,
  };

  constructor(
    personality?: Partial<TutorPersonality>,
    config?: Partial<AIServiceConfig>
  ) {
    if (personality) {
      this.personality = { ...this.personality, ...personality };
    }
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async analyzeContent(content: PageContent): Promise<EducationalExplanation> {
    // Simulate API delay
    await this.delay(1000 + Math.random() * 1000);

    return {
      summary: this.generateSummary(content),
      keyPoints: this.generateKeyPoints(content),
      examples: this.generateExamples(content),
      suggestedQuestions: this.generateQuestions(content),
      nextSteps: this.generateNextSteps(content),
      relatedTopics: this.generateRelatedTopics(content),
    };
  }

  async generateResponse(
    question: string,
    context: PageContent
  ): Promise<string> {
    // Simulate thinking delay
    await this.delay(800 + Math.random() * 700);

    const responses = this.getContextualResponses(question, context);
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async explainPage(context: PageContent): Promise<string> {
    // Simulate thinking delay
    await this.delay(1000 + Math.random() * 800);

    return this.generatePageExplanation(context);
  }

  getGreeting(): string {
    return this.personality.greetingMessage;
  }

  private generateSummary(content: PageContent): string {
    const templates = {
      course: [
        `This ${content.difficulty} level course on "${
          content.title
        }" covers ${content.topics.join(", ")}. `,
        `Let me break down this ${content.difficulty} ${content.pageType} about ${content.title} for you. `,
        `This is a comprehensive ${content.difficulty} guide to ${content.title}. `,
      ],
      program: [
        `This ${content.difficulty} program "${
          content.title
        }" focuses on ${content.topics.join(" and ")}. `,
        `The ${content.title} program is designed for ${content.difficulty} learners interested in ${content.topics[0]}. `,
        `This program covers essential concepts in ${content.topics.join(
          ", "
        )} at a ${content.difficulty} level. `,
      ],
      tutorial: [
        `This ${content.difficulty} tutorial on "${
          content.title
        }" teaches you about ${content.topics.join(" and ")}. `,
        `Let's explore this step-by-step ${content.difficulty} tutorial covering ${content.title}. `,
        `This hands-on tutorial focuses on ${content.topics.join(
          ", "
        )} concepts. `,
      ],
      general: [
        `This page discusses ${
          content.title
        } and covers topics like ${content.topics.join(", ")}. `,
        `Let me help you understand the key concepts presented on this page about ${content.title}. `,
        `This content explores ${content.topics.join(" and ")} in a ${
          content.difficulty
        }-friendly way. `,
      ],
    };

    const typeTemplates = templates[content.pageType] || templates.general;
    const baseTemplate =
      typeTemplates[Math.floor(Math.random() * typeTemplates.length)];

    const encouragements = [
      "I'll help you understand each concept step by step!",
      "Let's make this learning journey engaging and fun!",
      "I'm here to answer any questions you might have!",
      "Together, we'll master these concepts!",
      "Don't worry if it seems complex - we'll break it down!",
    ];

    return (
      baseTemplate +
      encouragements[Math.floor(Math.random() * encouragements.length)]
    );
  }

  private generateKeyPoints(content: PageContent): string[] {
    const pointTemplates = {
      programming: [
        "Understanding the fundamentals is crucial for building strong coding skills",
        "Practice with real examples helps solidify programming concepts",
        "Learning best practices early prevents common mistakes",
        "Code organization and structure are as important as functionality",
      ],
      "data-science": [
        "Data quality is fundamental to meaningful analysis",
        "Understanding statistics helps interpret results correctly",
        "Visualization makes complex data insights accessible",
        "Machine learning requires both theory and practical application",
      ],
      business: [
        "Strategic thinking drives successful business decisions",
        "Understanding market dynamics is essential for growth",
        "Leadership skills can be developed through practice and reflection",
        "Customer focus should guide all business initiatives",
      ],
      design: [
        "User experience should be the primary focus of design",
        "Visual hierarchy guides user attention effectively",
        "Consistency in design creates trust and usability",
        "Testing designs with real users provides valuable feedback",
      ],
      general: [
        "Breaking complex topics into smaller parts makes them manageable",
        "Practical application reinforces theoretical learning",
        "Regular practice builds confidence and competency",
        "Connecting concepts to real-world examples aids understanding",
      ],
    };

    const topic = content.topics[0] || "general";
    const relevantPoints =
      pointTemplates[topic as keyof typeof pointTemplates] ||
      pointTemplates.general;

    // Return 3-4 relevant points
    return relevantPoints.slice(0, 3 + Math.floor(Math.random() * 2));
  }

  private generateExamples(content: PageContent): string[] {
    const exampleTemplates = {
      programming: [
        "Think of variables like labeled boxes that store different types of information",
        "Functions are like recipes - they take ingredients (parameters) and produce a result",
        "Loops are like repeating a task until a condition is met, like counting to 100",
      ],
      "data-science": [
        "Imagine analyzing customer purchase patterns to predict future buying behavior",
        "Consider how weather data can be used to forecast agricultural yields",
        "Think about how streaming services recommend content based on viewing history",
      ],
      business: [
        "Consider how companies like Amazon use customer data to improve service",
        "Think about how startups identify market gaps and create solutions",
        "Observe how successful leaders communicate vision to their teams",
      ],
      general: [
        "Consider real-world applications of these concepts in daily life",
        "Think about how professionals in this field apply these principles",
        "Imagine solving practical problems using these methods",
      ],
    };

    const topic = content.topics[0] || "general";
    const examples =
      exampleTemplates[topic as keyof typeof exampleTemplates] ||
      exampleTemplates.general;

    return examples.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  private generateQuestions(content: PageContent): string[] {
    const questionTemplates = [
      `How would you apply ${content.title} in a real project?`,
      `What challenges might you face when implementing these concepts?`,
      `Can you think of similar examples in other fields?`,
      `What would happen if we changed one of the key variables?`,
      `How does this relate to what you already know?`,
      `What questions do you have about the specific details?`,
      `Which part would you like me to explain in more depth?`,
    ];

    // Return 3-4 questions
    const shuffled = questionTemplates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3 + Math.floor(Math.random() * 2));
  }

  private generateNextSteps(content: PageContent): string[] {
    const stepTemplates = {
      beginner: [
        "Try practicing with simple examples to build confidence",
        "Look for additional beginner-friendly resources on this topic",
        "Join online communities to discuss concepts with other learners",
        "Set up hands-on practice sessions to reinforce learning",
      ],
      intermediate: [
        "Challenge yourself with more complex scenarios",
        "Explore advanced features and techniques",
        "Work on a personal project applying these concepts",
        "Connect with professionals in this field for mentorship",
      ],
      advanced: [
        "Contribute to open-source projects in this area",
        "Consider teaching others to deepen your understanding",
        "Explore cutting-edge research and developments",
        "Network with industry experts and thought leaders",
      ],
    };

    const steps = stepTemplates[content.difficulty];
    return steps.slice(0, 3);
  }

  private generateRelatedTopics(content: PageContent): string[] {
    const relatedMap = {
      programming: [
        "software-engineering",
        "algorithms",
        "databases",
        "web-development",
      ],
      "data-science": [
        "statistics",
        "machine-learning",
        "data-visualization",
        "analytics",
      ],
      business: ["entrepreneurship", "marketing", "finance", "strategy"],
      design: [
        "user-research",
        "prototyping",
        "visual-design",
        "interaction-design",
      ],
      general: ["problem-solving", "critical-thinking", "project-management"],
    };

    const primaryTopic = content.topics[0] || "general";
    const related =
      relatedMap[primaryTopic as keyof typeof relatedMap] || relatedMap.general;

    return related.slice(0, 3);
  }

  private getContextualResponses(
    question: string,
    context: PageContent
  ): string[] {
    const questionLower = question.toLowerCase();

    if (questionLower.includes("how") || questionLower.includes("what")) {
      return [
        `Great question! Let me explain that in the context of ${context.title}...`,
        `That's an important concept! Here's how it works...`,
        `I'm glad you asked! This is a key part of understanding ${context.topics[0]}...`,
      ];
    }

    if (questionLower.includes("why")) {
      return [
        `The reason behind this is quite interesting...`,
        `That's because in ${context.topics[0]}, we need to consider...`,
        `This happens due to the fundamental principle that...`,
      ];
    }

    if (questionLower.includes("example")) {
      return [
        `Here's a great example that relates to ${context.title}...`,
        `Let me give you a practical example...`,
        `Consider this scenario in the context of ${context.topics[0]}...`,
      ];
    }

    return [
      `That's a thoughtful question about ${context.title}. Let me help you understand...`,
      `I can see you're thinking deeply about this topic. Here's my take...`,
      `Great curiosity! This is exactly the kind of question that leads to deeper learning...`,
    ];
  }

  private generatePageExplanation(context: PageContent): string {
    const explanationTemplates = {
      course: [
        `This ${context.difficulty} course on "${
          context.title
        }" is designed to give you a solid foundation in ${context.topics.join(
          " and "
        )}. The content is structured to build your understanding step by step, making complex concepts accessible and practical.`,
        `Welcome to this comprehensive ${context.difficulty} course! "${
          context.title
        }" covers essential topics like ${context.topics.join(
          ", "
        )}. This content will help you develop both theoretical knowledge and practical skills.`,
        `This course page focuses on "${
          context.title
        }" and explores key areas including ${context.topics.join(
          " and "
        )}. It's perfect for ${
          context.difficulty
        } learners looking to expand their expertise.`,
      ],
      program: [
        `This ${context.difficulty} program "${
          context.title
        }" offers a comprehensive learning journey through ${context.topics.join(
          " and "
        )}. It's designed to provide you with industry-relevant skills and knowledge.`,
        `The "${context.title}" program is structured to take you from ${
          context.difficulty
        } concepts to advanced applications in ${context.topics.join(
          ", "
        )}. Each section builds upon the previous one.`,
        `This program page outlines a complete learning path for ${
          context.title
        }, covering essential topics like ${context.topics.join(
          " and "
        )}. It's tailored for ${context.difficulty} level learners.`,
      ],
      tutorial: [
        `This ${context.difficulty} tutorial on "${
          context.title
        }" provides hands-on guidance for ${context.topics.join(
          " and "
        )}. You'll learn through practical examples and step-by-step instructions.`,
        `Welcome to this practical tutorial! "${
          context.title
        }" walks you through ${context.topics.join(
          ", "
        )} with clear explanations and real-world applications.`,
        `This tutorial page is your guide to mastering ${
          context.title
        }. It covers ${context.topics.join(" and ")} in a ${
          context.difficulty
        }-friendly way with actionable insights.`,
      ],
      general: [
        `This page provides valuable insights into "${
          context.title
        }" and covers important topics like ${context.topics.join(
          ", "
        )}. The content is presented in a clear, ${
          context.difficulty
        }-appropriate manner.`,
        `Here you'll find comprehensive information about ${
          context.title
        }, exploring key concepts in ${context.topics.join(
          " and "
        )}. The material is designed to be both informative and engaging.`,
        `This content page focuses on ${
          context.title
        } and delves into essential areas including ${context.topics.join(
          ", "
        )}. It's structured to help ${
          context.difficulty
        } learners grasp important concepts.`,
      ],
    };

    const templates =
      explanationTemplates[context.pageType] || explanationTemplates.general;
    const baseExplanation =
      templates[Math.floor(Math.random() * templates.length)];

    const encouragingClosings = [
      " I'm here to help you understand any part of this content - feel free to ask me specific questions!",
      " This is valuable knowledge that will serve you well in your learning journey. What would you like to explore first?",
      " The concepts here are building blocks for more advanced topics. Let me know if you'd like me to explain anything in more detail!",
      " This content is designed to be practical and applicable. Ask me about any specific aspect that interests you!",
    ];

    return (
      baseExplanation +
      encouragingClosings[
        Math.floor(Math.random() * encouragingClosings.length)
      ]
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to simulate different AI personalities
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
