"use client";

import React, { useEffect, useState } from "react";
import { AITutorState } from "../Types";
import "./AIAvatar.css";

interface AIAvatarProps {
  state: AITutorState["avatarState"];
  personality?: "friendly" | "professional" | "encouraging" | "casual";
  size?: "small" | "medium" | "large";
  showVoiceWaves?: boolean;
}

const AIAvatar: React.FC<AIAvatarProps> = ({
  state = "idle",
  personality = "friendly",
  size = "medium",
  showVoiceWaves = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (state === "speaking" || state === "thinking") {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const getAvatarColor = () => {
    const colors = {
      friendly: {
        primary: "#4F46E5", // Indigo
        secondary: "#818CF8",
        accent: "#C7D2FE",
      },
      professional: {
        primary: "#1F2937", // Gray
        secondary: "#6B7280",
        accent: "#D1D5DB",
      },
      encouraging: {
        primary: "#059669", // Emerald
        secondary: "#34D399",
        accent: "#A7F3D0",
      },
      casual: {
        primary: "#F59E0B", // Amber
        secondary: "#FBBF24",
        accent: "#FEF3C7",
      },
    };
    return colors[personality] || colors.friendly;
  };

  const colors = getAvatarColor();

  return (
    <div className={`ai-avatar ai-avatar--${size} ai-avatar--${state}`}>
      {/* Voice waves background (only when speaking) */}
      {showVoiceWaves && state === "speaking" && (
        <div className="voice-waves">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
      )}

      {/* Avatar container */}
      <div className="avatar-container">
        {/* Main avatar circle */}
        <div
          className="avatar-main"
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.secondary,
          }}
        >
          {/* Face elements */}
          <div className="avatar-face">
            {/* Eyes */}
            <div className="eyes">
              <div
                className={`eye eye-left ${
                  state === "thinking" ? "eye--thinking" : ""
                }`}
              >
                <div className="pupil"></div>
              </div>
              <div
                className={`eye eye-right ${
                  state === "thinking" ? "eye--thinking" : ""
                }`}
              >
                <div className="pupil"></div>
              </div>
            </div>

            {/* Mouth */}
            <div className={`mouth mouth--${state} mouth--${personality}`}>
              {state === "speaking" && (
                <div className="mouth-animation">
                  <div className="speech-indicator"></div>
                </div>
              )}
            </div>
          </div>

          {/* Thinking indicator */}
          {state === "thinking" && (
            <div className="thinking-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
            </div>
          )}
        </div>

        {/* Status glow */}
        <div
          className={`status-glow status-glow--${state}`}
          style={{ backgroundColor: colors.accent }}
        ></div>
      </div>

      {/* Status text */}
      <div className="avatar-status">{getStatusText(state)}</div>
    </div>
  );
};

function getStatusText(state: AITutorState["avatarState"]): string {
  switch (state) {
    case "speaking":
      return "Speaking...";
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "idle":
    default:
      return "Ready to help!";
  }
}

export default AIAvatar;
