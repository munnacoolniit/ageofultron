import { PageContent, ContentExtractionOptions } from "../Types";

export class ContentExtractor {
  private static readonly DEFAULT_OPTIONS: ContentExtractionOptions = {
    includeImages: false,
    includeLinks: false,
    maxContentLength: 3000,
    prioritySelectors: [
      "main",
      "article",
      '[role="main"]',
      ".course-content",
      ".program-details",
      ".tutorial-content",
      ".section-content",
    ],
  };

  private static readonly HEADING_SELECTORS = "h1, h2, h3, h4, h5, h6";
  private static readonly CONTENT_SELECTORS =
    "p, li, .content-text, .description";

  static extractPageContent(
    options: Partial<ContentExtractionOptions> = {}
  ): PageContent {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      const title = this.extractTitle();
      const headings = this.extractHeadings();
      const mainContent = this.extractMainContent(config);
      const topics = this.identifyTopics(title, headings, mainContent);
      const difficulty = this.assessDifficulty(mainContent, headings);
      const pageType = this.determinePageType();
      const courseContext = this.extractCourseContext();

      console.log("🔍 ContentExtractor Debug:");
      console.log("  Title:", title);
      console.log("  Headings:", headings);
      console.log("  Main Content Length:", mainContent.length);
      console.log(
        "  Main Content Preview:",
        mainContent.substring(0, 200) + "..."
      );
      console.log("  Topics:", topics);
      console.log("  Page Type:", pageType);
      console.log("  Course Context:", courseContext);

      return {
        title,
        headings,
        mainContent,
        topics,
        difficulty,
        pageType,
        courseContext,
      };
    } catch (error) {
      console.error("Error extracting page content:", error);
      // Return fallback content
      return {
        title: document.title || "Current Page",
        headings: ["Welcome"],
        mainContent: "Let me help you understand this page content.",
        topics: ["general"],
        difficulty: "beginner",
        pageType: "general",
      };
    }
  }

  private static extractTitle(): string {
    // Try multiple strategies to get the page title
    const titleSources = [
      () => document.querySelector("h1")?.textContent?.trim(),
      () =>
        document
          .querySelector('[data-testid="page-title"]')
          ?.textContent?.trim(),
      () => document.querySelector(".page-title")?.textContent?.trim(),
      () => document.title?.trim(),
      () => "Current Page",
    ];

    for (const getTitle of titleSources) {
      const title = getTitle();
      if (title && title.length > 0) {
        return title;
      }
    }

    return "Current Page";
  }

  private static extractHeadings(): string[] {
    const headings = Array.from(
      document.querySelectorAll(this.HEADING_SELECTORS)
    )
      .map((heading) => heading.textContent?.trim())
      .filter((text) => text && text.length > 0)
      .slice(0, 10); // Limit to top 10 headings

    return headings as string[];
  }

  private static extractMainContent(config: ContentExtractionOptions): string {
    let content = "";

    // Try priority selectors first
    for (const selector of config.prioritySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = this.extractTextFromElement(element);
        if (content.length > 100) break; // Good content found
      }
    }

    // Fallback: extract from common content areas
    if (content.length < 100) {
      content = this.extractFallbackContent();
    }

    // Clean and truncate content
    content = this.cleanContent(content);
    if (content.length > config.maxContentLength) {
      content = content.substring(0, config.maxContentLength) + "...";
    }

    return content;
  }

  private static extractTextFromElement(element: Element): string {
    // Clone element to avoid modifying the original
    const clone = element.cloneNode(true) as Element;

    // Remove script, style, and navigation elements
    const unwantedSelectors = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      ".navigation",
      ".menu",
      ".ads",
      ".social-media",
    ];

    unwantedSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    return clone.textContent?.trim() || "";
  }

  private static extractFallbackContent(): string {
    const contentElements = Array.from(
      document.querySelectorAll(this.CONTENT_SELECTORS)
    );
    return contentElements
      .map((el) => el.textContent?.trim())
      .filter((text) => text && text.length > 20)
      .slice(0, 20) // Take first 20 meaningful paragraphs
      .join(" ");
  }

  private static cleanContent(content: string): string {
    return content
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
      .replace(/[^\w\s\.\,\!\?\:\;\-\(\)]/g, "") // Remove special characters
      .trim();
  }

  private static identifyTopics(
    title: string,
    headings: string[],
    content: string
  ): string[] {
    const combinedText = `${title} ${headings.join(
      " "
    )} ${content}`.toLowerCase();

    const topicKeywords = {
      programming: [
        "code",
        "programming",
        "development",
        "javascript",
        "python",
        "react",
        "css",
        "html",
      ],
      "data-science": [
        "data",
        "analytics",
        "machine learning",
        "ai",
        "statistics",
        "python",
        "r",
      ],
      business: [
        "business",
        "management",
        "strategy",
        "marketing",
        "finance",
        "leadership",
      ],
      design: [
        "design",
        "ui",
        "ux",
        "graphics",
        "creative",
        "photoshop",
        "figma",
      ],
      cloud: ["cloud", "aws", "azure", "devops", "kubernetes", "docker"],
      cybersecurity: [
        "security",
        "cybersecurity",
        "encryption",
        "network",
        "privacy",
      ],
      "digital-marketing": [
        "digital marketing",
        "seo",
        "social media",
        "advertising",
        "content marketing",
      ],
    };

    const detectedTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matchCount = keywords.filter((keyword) =>
        combinedText.includes(keyword)
      ).length;

      if (matchCount >= 2) {
        // Require at least 2 keyword matches
        detectedTopics.push(topic);
      }
    }

    return detectedTopics.length > 0 ? detectedTopics : ["general"];
  }

  private static assessDifficulty(
    content: string,
    headings: string[]
  ): "beginner" | "intermediate" | "advanced" {
    const text = `${content} ${headings.join(" ")}`.toLowerCase();

    const indicators = {
      beginner: [
        "introduction",
        "basics",
        "getting started",
        "fundamental",
        "overview",
        "beginner",
      ],
      intermediate: [
        "advanced",
        "deep dive",
        "optimization",
        "best practices",
        "implementation",
      ],
      advanced: [
        "expert",
        "mastery",
        "complex",
        "enterprise",
        "architecture",
        "professional",
      ],
    };

    let scores = { beginner: 0, intermediate: 0, advanced: 0 };

    for (const [level, keywords] of Object.entries(indicators)) {
      keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          scores[level as keyof typeof scores]++;
        }
      });
    }

    // Return level with highest score, default to intermediate
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return "intermediate";

    return Object.keys(scores).find(
      (key) => scores[key as keyof typeof scores] === maxScore
    ) as "beginner" | "intermediate" | "advanced";
  }

  private static determinePageType(): PageContent["pageType"] {
    const url = window.location.pathname.toLowerCase();
    const title = document.title.toLowerCase();

    if (url.includes("course") || title.includes("course")) return "course";
    if (url.includes("program") || title.includes("program")) return "program";
    if (url.includes("tutorial") || title.includes("tutorial"))
      return "tutorial";

    return "general";
  }

  private static extractCourseContext(): string | undefined {
    // Look for course-specific information
    const contextSelectors = [
      ".course-info",
      ".program-info",
      '[data-testid="course-description"]',
      ".course-overview",
    ];

    for (const selector of contextSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim().substring(0, 500);
      }
    }

    return undefined;
  }

  // Utility method to get current page summary for debugging
  static getPageSummary(): string {
    const content = this.extractPageContent();
    return `Page: ${content.title}\nTopics: ${content.topics.join(
      ", "
    )}\nDifficulty: ${content.difficulty}`;
  }
}
