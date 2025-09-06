"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AITutorState,
  ChatMessage,
  PageContent,
  EducationalExplanation,
  TutorPersonality,
} from "../Types";
import { ContentExtractor } from "../Services/ContentExtractor";
import { MockAIService } from "../Services/MockAIService";
import { GeminiAIService } from "../Services/GeminiAIService";
import { TTSService } from "../Services/TTSService";
import { SpeechRecognitionService } from "../Services/SpeechRecognitionService";
import { ReliableVoiceInput } from "../Services/ReliableVoiceInput";
import {
  AI_CONFIG,
  getAIServiceConfig,
  UPGRAD_TUTOR_PERSONALITY,
} from "@/lib/utils/config/aiConfig";
import AIAvatar from "../Avatar/AIAvatar";
import ChatMessageComponent from "../Chat/ChatMessage";
import ChatInput from "../Chat/ChatInput";
import "./AITutorModal.css";

interface AITutorModalProps {
  isVisible: boolean;
  onClose: () => void;
  personality?: TutorPersonality;
  autoAnalyze?: boolean;
  showVoiceControls?: boolean;
}

const AITutorModal: React.FC<AITutorModalProps> = ({
  isVisible,
  onClose,
  personality,
  autoAnalyze = true,
  showVoiceControls = true,
}) => {
  const [state, setState] = useState<AITutorState>({
    isVisible,
    isLoading: false,
    currentExplanation: null,
    chatHistory: [],
    avatarState: "idle",
    voiceEnabled: true,
    speechRecognitionEnabled: ReliableVoiceInput.isSupported(),
    isListening: false,
    currentTopic: null,
    voiceMuted: false,
  });

  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const aiServiceRef = useRef<MockAIService | GeminiAIService>();
  const ttsServiceRef = useRef<TTSService>();
  const speechRecognitionRef = useRef<SpeechRecognitionService>();
  const voiceInputRef = useRef<ReliableVoiceInput>();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize services
  useEffect(() => {
    const config = getAIServiceConfig();
    const tutorPersonality = personality || UPGRAD_TUTOR_PERSONALITY;

    console.log("🔧 AI Service Config:", config);

    if (config.provider === "gemini" && config.apiKey) {
      console.log(
        "✅ Using GeminiAIService with API key:",
        config.apiKey.substring(0, 10) + "..."
      );
      aiServiceRef.current = new GeminiAIService(
        config.apiKey,
        tutorPersonality,
        config
      );
    } else {
      console.warn("⚠️ Using MockAIService - Gemini API not configured");
      console.log("Config details:", {
        provider: config.provider,
        hasApiKey: !!config.apiKey,
      });
      aiServiceRef.current = new MockAIService(tutorPersonality, config);
    }

    ttsServiceRef.current = new TTSService({ enabled: state.voiceEnabled });

    // Initialize speech recognition if supported
    if (state.speechRecognitionEnabled) {
      speechRecognitionRef.current = new SpeechRecognitionService({
        language: "en-US",
        continuous: false,
        interimResults: true,
      });
    }
  }, [personality]);

  // Handle visibility changes
  useEffect(() => {
    setState((prev) => ({ ...prev, isVisible }));

    if (isVisible && autoAnalyze) {
      initializeConversation();
    }
  }, [isVisible, autoAnalyze]);

  // Request permission when modal opens (no auto-start to prevent loops)
  useEffect(() => {
    if (isVisible && state.speechRecognitionEnabled && !state.voiceMuted) {
      const requestPermission = async () => {
        try {
          console.log("Checking microphone permission...");
          const hasPermission = await ReliableVoiceInput.requestPermission();

          if (!hasPermission) {
            console.log("Permission denied - muting voice");
            setState((prev) => ({
              ...prev,
              voiceMuted: true,
              chatHistory: [
                ...prev.chatHistory,
                {
                  id: `permission-${Date.now()}`,
                  type: "system",
                  content:
                    "🎤 Microphone access denied. Click the microphone button below to try again, or type your questions!",
                  timestamp: new Date(),
                },
              ],
            }));
          }
        } catch (error) {
          console.error("Permission check failed:", error);
        }
      };

      const timer = setTimeout(requestPermission, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, state.speechRecognitionEnabled]);

  // Manual voice input starter
  const startVoiceInput = useCallback(async () => {
    if (!voiceInputRef.current || state.isListening || state.voiceMuted) return;

    try {
      await voiceInputRef.current.startListening();
    } catch (error) {
      console.error("Failed to start voice input:", error);
    }
  }, [state.isListening, state.voiceMuted]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [state.chatHistory]);

  const initializeConversation = useCallback(async () => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        avatarState: "thinking",
        chatHistory: [],
      }));

      // Extract page content
      const content = ContentExtractor.extractPageContent();
      console.log("🔍 Extracted page content:", content);
      setPageContent(content);

      // Add greeting message
      const greetingMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: "ai",
        content:
          aiServiceRef.current?.getGreeting() ||
          "Hello! I'm here to help you understand this content.",
        timestamp: new Date(),
      };

      // Generate page explanation using "Explain me this page" prompt
      if (aiServiceRef.current) {
        console.log("🤖 Generating page explanation with AI service...");
        const pageExplanation = await aiServiceRef.current.explainPage(content);
        console.log("📝 AI page explanation result:", pageExplanation);

        const explanationMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: "ai",
          content: pageExplanation,
          timestamp: new Date(),
        };

        // Also analyze content for additional context (for suggested questions, etc.)
        console.log("🤖 Analyzing content for additional context...");
        const explanation = await aiServiceRef.current.analyzeContent(content);
        console.log("📝 AI analysis result:", explanation);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          avatarState: "idle",
          currentExplanation: explanation,
          currentTopic: content.title,
          chatHistory: [greetingMessage, explanationMessage],
        }));

        // Auto-play greeting and page explanation if voice is enabled
        if (state.voiceEnabled && ttsServiceRef.current) {
          setTimeout(async () => {
            setState((prev) => ({ ...prev, avatarState: "speaking" }));

            try {
              console.log("🔊 Speaking greeting:", greetingMessage.content);
              await ttsServiceRef.current?.speak(greetingMessage.content);

              console.log("🔊 Speaking page explanation:", pageExplanation);
              await ttsServiceRef.current?.speak(pageExplanation);
            } catch (error) {
              console.error("TTS Error:", error);
            } finally {
              setState((prev) => ({ ...prev, avatarState: "idle" }));
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error initializing conversation:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        avatarState: "idle",
        chatHistory: [
          {
            id: `error-${Date.now()}`,
            type: "system",
            content:
              "Sorry, I encountered an error while analyzing this page. Please try asking me a question!",
            timestamp: new Date(),
          },
        ],
      }));
    }
  }, [state.voiceEnabled]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!aiServiceRef.current || !pageContent) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: "user",
        content: message,
        timestamp: new Date(),
      };

      // Add loading message
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        type: "ai",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setState((prev) => ({
        ...prev,
        chatHistory: [...prev.chatHistory, userMessage, loadingMessage],
        avatarState: "thinking",
      }));

      try {
        // Generate AI response
        console.log("🤖 Generating response for:", message);
        console.log("📄 Using page content:", pageContent);
        const response = await aiServiceRef.current.generateResponse(
          message,
          pageContent
        );
        console.log("💬 AI response:", response);

        const aiMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: "ai",
          content: response,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          chatHistory: prev.chatHistory
            .filter((msg) => !msg.isLoading)
            .concat([aiMessage]),
          avatarState: "idle",
        }));

        // Auto-play response if voice is enabled
        if (state.voiceEnabled && ttsServiceRef.current) {
          setTimeout(() => {
            setState((prev) => ({ ...prev, avatarState: "speaking" }));

            ttsServiceRef.current?.speak(response).finally(() => {
              setState((prev) => ({ ...prev, avatarState: "idle" }));
            });
          }, 300);
        }
      } catch (error) {
        console.error("Error generating response:", error);

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: "system",
          content:
            "Sorry, I had trouble understanding that. Could you try rephrasing your question?",
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          chatHistory: prev.chatHistory
            .filter((msg) => !msg.isLoading)
            .concat([errorMessage]),
          avatarState: "idle",
        }));
      }
    },
    [pageContent, state.voiceEnabled]
  );

  // Initialize Reliable Voice Input after handleSendMessage is defined
  useEffect(() => {
    if (ReliableVoiceInput.isSupported()) {
      voiceInputRef.current = new ReliableVoiceInput({
        language: "en-US",
        maxDuration: 10000,
      });

      // Set up simple callbacks
      voiceInputRef.current.onListeningStart(() => {
        console.log("ReliableVoice: Listening started");
        setState((prev) => ({
          ...prev,
          isListening: true,
          avatarState: "listening",
        }));
      });

      voiceInputRef.current.onListeningEnd(() => {
        console.log("ReliableVoice: Listening ended");
        setState((prev) => ({
          ...prev,
          isListening: false,
          avatarState: "idle",
        }));
      });

      voiceInputRef.current.onSpeechResult((transcript) => {
        console.log("ReliableVoice: Got speech result:", transcript);
        setState((prev) => ({
          ...prev,
          isListening: false,
          avatarState: "thinking",
        }));

        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      });

      voiceInputRef.current.onError((error) => {
        console.error("ReliableVoice: Error:", error);
        setState((prev) => ({
          ...prev,
          isListening: false,
          avatarState: "idle",
          voiceMuted: error.includes("denied"),
          chatHistory: [
            ...prev.chatHistory,
            {
              id: `error-${Date.now()}`,
              type: "system",
              content: error,
              timestamp: new Date(),
            },
          ],
        }));
      });
    }
  }, [handleSendMessage]);

  const handlePlayAudio = useCallback(
    async (text: string) => {
      if (!ttsServiceRef.current || !state.voiceEnabled) return;

      setState((prev) => ({ ...prev, avatarState: "speaking" }));

      try {
        await ttsServiceRef.current.speak(text);
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setState((prev) => ({ ...prev, avatarState: "idle" }));
      }
    },
    [state.voiceEnabled]
  );

  const handleVoiceInput = useCallback(async () => {
    if (
      !speechRecognitionRef.current ||
      !state.speechRecognitionEnabled ||
      state.isListening
    ) {
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        isListening: true,
        avatarState: "listening",
      }));

      // Set up speech recognition callbacks
      speechRecognitionRef.current.onResult((transcript, isFinal) => {
        if (isFinal && transcript.trim()) {
          // Process the final transcript as a user message
          handleSendMessage(transcript.trim());
        }
      });

      speechRecognitionRef.current.onEnd(() => {
        setState((prev) => ({
          ...prev,
          isListening: false,
          avatarState: "idle",
        }));
      });

      speechRecognitionRef.current.onError((error) => {
        console.error("Speech recognition error:", error);
        setState((prev) => ({
          ...prev,
          isListening: false,
          avatarState: "idle",
        }));

        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: "system",
          content: `Voice input error: ${error}. Please try typing your question instead.`,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          chatHistory: [...prev.chatHistory, errorMessage],
        }));
      });

      // Start listening
      await speechRecognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start voice input:", error);
      setState((prev) => ({
        ...prev,
        isListening: false,
        avatarState: "idle",
      }));
    }
  }, [state.speechRecognitionEnabled, state.isListening, handleSendMessage]);

  const toggleVoice = useCallback(() => {
    const newVoiceState = !state.voiceEnabled;

    setState((prev) => ({ ...prev, voiceEnabled: newVoiceState }));

    if (ttsServiceRef.current) {
      if (newVoiceState) {
        ttsServiceRef.current.enable();
      } else {
        ttsServiceRef.current.disable();
      }
    }
  }, [state.voiceEnabled]);

  const handleStop = useCallback(() => {
    console.log("🛑 Stop button clicked - stopping AI speech");

    // Stop TTS immediately
    if (ttsServiceRef.current) {
      ttsServiceRef.current.stop();
    }

    // Update avatar state to idle
    setState((prev) => ({ ...prev, avatarState: "idle" }));
  }, []);

  const handleClose = useCallback(() => {
    // Stop any ongoing speech
    if (ttsServiceRef.current) {
      ttsServiceRef.current.stop();
    }

    // Stop any ongoing speech recognition
    if (speechRecognitionRef.current && state.isListening) {
      speechRecognitionRef.current.stop();
    }

    // Stop voice input
    if (voiceInputRef.current) {
      voiceInputRef.current.abort();
    }

    setState((prev) => ({ ...prev, avatarState: "idle", isListening: false }));
    onClose();
  }, [onClose, state.isListening]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!state.isVisible) return null;

  return (
    <div className="ai-tutor-modal-overlay" onClick={handleOverlayClick}>
      <div className="ai-tutor-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <AIAvatar
              state={state.avatarState}
              personality={personality?.style}
              size="small"
              showVoiceWaves={state.voiceEnabled}
            />
            <div className="header-info">
              <h3 className="tutor-name">{personality?.name || "AI Tutor"}</h3>
              {state.currentTopic && (
                <p className="current-topic">
                  Learning about: {state.currentTopic}
                </p>
              )}
              {state.isListening && (
                <p className="listening-indicator">
                  🎤 Listening for your question...
                </p>
              )}
            </div>
          </div>

          <div className="header-controls">
            {/* Stop Button - Show when AI is speaking */}
            {state.avatarState === "speaking" && (
              <button
                className="stop-button"
                onClick={handleStop}
                title="Stop AI speech"
                aria-label="Stop AI speech"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span className="stop-text">Stop</span>
              </button>
            )}

            {/* Voice Mute Button */}
            {state.speechRecognitionEnabled && (
              <button
                className={`voice-mute-button ${
                  state.voiceMuted ? "muted" : ""
                }`}
                onClick={() => {
                  const newMutedState = !state.voiceMuted;
                  setState((prev) => ({ ...prev, voiceMuted: newMutedState }));

                  if (newMutedState && voiceInputRef.current) {
                    voiceInputRef.current.disable();
                  } else if (!newMutedState && voiceInputRef.current) {
                    voiceInputRef.current.enable();
                    // Don't auto-start, let user click mic button
                  }
                }}
                title={
                  state.voiceMuted
                    ? "Enable voice input"
                    : "Disable voice input"
                }
                aria-label={
                  state.voiceMuted
                    ? "Enable voice input"
                    : "Disable voice input"
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {state.voiceMuted ? (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    </>
                  )}
                </svg>
                {state.voiceMuted ? "Enable Mic" : "Mute Mic"}
              </button>
            )}

            {/* Manual Stop Button when listening */}
            {state.isListening && !state.voiceMuted && (
              <button
                className="stop-listening-button"
                onClick={() => {
                  if (voiceInputRef.current) {
                    voiceInputRef.current.stop();
                  }
                }}
                title="Stop listening"
                aria-label="Stop listening"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                </svg>
                Stop
              </button>
            )}

            {showVoiceControls && TTSService.isSupported() && (
              <button
                className={`voice-toggle ${state.voiceEnabled ? "active" : ""}`}
                onClick={toggleVoice}
                title={state.voiceEnabled ? "Disable voice" : "Enable voice"}
                aria-label={
                  state.voiceEnabled ? "Disable voice" : "Enable voice"
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {state.voiceEnabled ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </>
                  )}
                </svg>
              </button>
            )}

            <button
              className="close-button"
              onClick={handleClose}
              title="Close AI Tutor"
              aria-label="Close AI Tutor"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Avatar-Focused Container */}
        <div className="avatar-conversation-container">
          {/* Large Avatar Section */}
          <div className="main-avatar-section">
            <AIAvatar
              state={state.avatarState}
              personality={personality?.style}
              size="large"
              showVoiceWaves={
                state.voiceEnabled && state.avatarState === "speaking"
              }
            />

            {/* Current Response Display */}
            <div className="current-response">
              {state.isLoading ? (
                <p className="response-text loading">
                  Analyzing this page content...
                </p>
              ) : state.isListening ? (
                <p className="response-text listening">
                  🎤 I'm listening... speak your question
                </p>
              ) : state.avatarState === "thinking" ? (
                <p className="response-text thinking">
                  🤔 Let me think about that...
                </p>
              ) : state.avatarState === "speaking" ? (
                <p className="response-text speaking">
                  🗣️{" "}
                  {state.chatHistory[state.chatHistory.length - 1]?.content ||
                    "Speaking..."}
                </p>
              ) : state.voiceMuted ? (
                <div className="response-text ready">
                  {/* Show latest AI message if available */}
                  {state.chatHistory.length > 0 &&
                  state.chatHistory[state.chatHistory.length - 1]?.type ===
                    "ai" ? (
                    <div className="latest-ai-message">
                      <p>
                        {
                          state.chatHistory[state.chatHistory.length - 1]
                            .content
                        }
                      </p>
                      <div className="help-prompt">
                        <p>
                          👋 Voice input is muted. Type your questions below or
                          click "Enable Mic" to use voice.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p>
                      👋 Ready to help! Voice input is muted. Type your
                      questions below or click "Enable Mic" to use voice.
                    </p>
                  )}
                  {state.currentTopic && (
                    <p className="topic-context">
                      Currently learning about:{" "}
                      <strong>{state.currentTopic}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="response-text ready">
                  {/* Show latest AI message if available */}
                  {state.chatHistory.length > 0 &&
                  state.chatHistory[state.chatHistory.length - 1]?.type ===
                    "ai" ? (
                    <div className="latest-ai-message">
                      <p>
                        {
                          state.chatHistory[state.chatHistory.length - 1]
                            .content
                        }
                      </p>
                      <div className="help-prompt">
                        <p>
                          👋 Ready to help! Click the microphone button below to
                          ask questions with your voice.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p>
                      👋 Ready to help! Click the microphone button below to ask
                      questions with your voice.
                    </p>
                  )}
                  {state.currentTopic && (
                    <p className="topic-context">
                      Currently learning about:{" "}
                      <strong>{state.currentTopic}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compact Chat History */}
          {state.chatHistory.length > 0 && (
            <div className="compact-chat-history">
              <details className="chat-history-toggle">
                <summary>
                  📝 Conversation History ({state.chatHistory.length} messages)
                </summary>
                <div className="chat-messages-compact">
                  {state.chatHistory.slice(-3).map((message) => (
                    <div
                      key={message.id}
                      className={`compact-message compact-message--${message.type}`}
                    >
                      <strong>{message.type === "user" ? "You" : "AI"}:</strong>{" "}
                      {message.content}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <ChatInput
            onSendMessage={handleSendMessage}
            onVoiceInput={startVoiceInput}
            isLoading={state.isLoading}
            disabled={!pageContent}
            placeholder={
              pageContent
                ? state.isListening
                  ? "🎤 Listening... Speak your question"
                  : "Type your question or click 🎤 to speak..."
                : "Loading..."
            }
            quickActions={
              state.currentExplanation
                ? [...state.currentExplanation.suggestedQuestions.slice(0, 4)]
                : undefined
            }
            speechRecognitionEnabled={state.speechRecognitionEnabled}
            isListening={state.isListening}
          />
        </div>
      </div>
    </div>
  );
};

export default AITutorModal;
