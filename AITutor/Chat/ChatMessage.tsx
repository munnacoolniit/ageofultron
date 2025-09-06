"use client";

import React from "react";
import { ChatMessage as ChatMessageType } from "../Types";
import "./ChatMessage.css";

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
  onPlayAudio?: (text: string) => void;
  showAudioButton?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLatest = false,
  onPlayAudio,
  showAudioButton = true,
}) => {
  const { type, content, timestamp, isLoading } = message;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handlePlayAudio = () => {
    if (onPlayAudio && content) {
      onPlayAudio(content);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`chat-message chat-message--${type} chat-message--loading`}
      >
        <div className="message-content">
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-message chat-message--${type} ${
        isLatest ? "chat-message--latest" : ""
      }`}
    >
      {type === "system" && (
        <div className="message-header">
          <span className="system-label">System</span>
        </div>
      )}

      <div className="message-content">
        <div className="message-text">{content}</div>

        {type === "ai" && showAudioButton && onPlayAudio && (
          <button
            className="audio-button"
            onClick={handlePlayAudio}
            title="Play audio"
            aria-label="Play message audio"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>
        )}
      </div>

      <div className="message-footer">
        <span className="message-time">{formatTime(timestamp)}</span>
        {type === "user" && (
          <div className="message-status">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
