"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import "./ChatInput.css";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showQuickActions?: boolean;
  quickActions?: string[];
  speechRecognitionEnabled?: boolean;
  isListening?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onVoiceInput,
  isLoading = false,
  placeholder = "Ask me anything about this content...",
  disabled = false,
  showQuickActions = true,
  quickActions = [
    "Explain this in simple terms",
    "Give me an example",
    "What are the key points?",
    "How can I apply this?",
  ],
  speechRecognitionEnabled = false,
  isListening = false,
}) => {
  const [message, setMessage] = useState("");
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage("");
    setShowActions(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const handleQuickAction = (action: string) => {
    onSendMessage(action);
    setShowActions(false);
  };

  const toggleQuickActions = () => {
    setShowActions(!showActions);
  };

  const handleVoiceInput = () => {
    if (onVoiceInput) {
      onVoiceInput();
    }
  };

  return (
    <div className="chat-input-container">
      {/* Quick Actions */}
      {showQuickActions && showActions && (
        <div className="quick-actions">
          <div className="quick-actions-header">
            <span>Quick questions:</span>
            <button
              className="close-quick-actions"
              onClick={() => setShowActions(false)}
              aria-label="Close quick actions"
            >
              ✕
            </button>
          </div>
          <div className="quick-actions-list">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-btn"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading || disabled}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input">
        <div className="input-wrapper">
          {showQuickActions && (
            <button
              className={`quick-actions-toggle ${showActions ? "active" : ""}`}
              onClick={toggleQuickActions}
              title="Quick questions"
              aria-label="Show quick question options"
              disabled={disabled}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 12h8"></path>
                <path d="M12 8v8"></path>
              </svg>
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="message-input"
            rows={1}
            maxLength={1000}
          />

          {/* Voice Input Button */}
          {speechRecognitionEnabled && (
            <button
              onClick={handleVoiceInput}
              disabled={disabled || isLoading}
              className={`voice-input-button ${isListening ? "listening" : ""}`}
              aria-label={isListening ? "Listening..." : "Voice input"}
              title={isListening ? "Listening..." : "Click to speak"}
            >
              {isListening ? (
                <div className="voice-animation">
                  <div className="pulse-ring"></div>
                  <div className="pulse-ring delay-1"></div>
                  <div className="pulse-ring delay-2"></div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </div>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className="send-button"
            aria-label="Send message"
            title="Send message (Enter)"
          >
            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            )}
          </button>
        </div>

        {/* Character count */}
        <div className="input-footer">
          <span className="character-count">{message.length}/1000</span>
          <span className="input-hint">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
