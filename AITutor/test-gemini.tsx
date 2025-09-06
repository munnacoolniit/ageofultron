// Test component for Gemini AI integration
// This file is for testing only - remove after verification

"use client";

import React, { useState } from "react";
import { GeminiAIService } from "./Services/GeminiAIService";
import { AI_CONFIG } from "@/lib/utils/config/aiConfig";

const TestGemini: React.FC = () => {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("Testing connection...");

    try {
      const geminiService = new GeminiAIService(AI_CONFIG.GEMINI_API_KEY);
      const isConnected = await geminiService.testConnection();

      if (isConnected) {
        setResult("✅ Gemini API connection successful!");

        // Test content analysis
        const testContent = {
          title: "Introduction to React",
          headings: ["What is React?", "Components", "JSX"],
          mainContent:
            "React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.",
          topics: ["programming", "javascript", "react"],
          difficulty: "beginner" as const,
          pageType: "tutorial" as const,
        };

        setResult((prev) => prev + "\n\nTesting content analysis...");
        const analysis = await geminiService.analyzeContent(testContent);
        setResult(
          (prev) =>
            prev +
            "\n\n📊 Analysis Result:\n" +
            JSON.stringify(analysis, null, 2)
        );
      } else {
        setResult("❌ Gemini API connection failed");
      }
    } catch (error) {
      setResult("❌ Error: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Gemini AI Service Test</h2>
      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Testing..." : "Test Gemini Connection"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
            fontSize: "14px",
          }}
        >
          {result}
        </pre>
      )}

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>
          <strong>API Key:</strong>{" "}
          {AI_CONFIG.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing"}
        </p>
        <p>
          <strong>Model:</strong> {AI_CONFIG.GEMINI_MODEL}
        </p>
        <p>
          <strong>Use Real AI:</strong>{" "}
          {AI_CONFIG.USE_REAL_AI ? "✅ Enabled" : "❌ Disabled"}
        </p>
      </div>
    </div>
  );
};

export default TestGemini;
