# AI Tutor System

A comprehensive AI-powered educational assistant that helps users understand page content through interactive chat, voice synthesis, and animated avatars.

## Features

✅ **Free Alternatives Used**

- Mock AI Service (easily replaceable with real AI APIs)
- Web Speech API for Text-to-Speech
- CSS-animated avatars
- No external dependencies for core functionality

✅ **Core Capabilities**

- Automatic page content analysis
- Interactive chat interface
- Voice synthesis with multiple voices
- Animated avatar with different states
- Responsive design
- Dark mode support
- Accessibility features

## Quick Integration

### 1. Basic Usage

```tsx
import { AITutorModal } from "@/components/AITutor";

function MyComponent() {
  const [showAITutor, setShowAITutor] = useState(false);

  return (
    <>
      <button onClick={() => setShowAITutor(true)}>Enable AI Mode</button>

      <AITutorModal
        isVisible={showAITutor}
        onClose={() => setShowAITutor(false)}
        autoAnalyze={true}
        showVoiceControls={true}
      />
    </>
  );
}
```

### 2. Integration with Header Toggle

```tsx
// In ClientHeaderWrapper.tsx
import { AITutorModal } from "@/components/AITutor";

// Add to the component:
const [showAITutor, setShowAITutor] = useState(false);

useEffect(() => {
  setShowAITutor(isAIModeEnabled);
}, [isAIModeEnabled]);

// Add to JSX:
<AITutorModal
  isVisible={showAITutor}
  onClose={() => globalState.setIsAIModeEnabled(false)}
/>;
```

### 3. Custom Personality

```tsx
import { MockAIService } from "@/components/AITutor";

const customPersonality = MockAIService.createPersonality("encouraging");

<AITutorModal
  isVisible={showAI}
  onClose={handleClose}
  personality={customPersonality}
/>;
```

## Architecture

### Components

- `AITutorModal`: Main modal container
- `AIAvatar`: Animated avatar with states
- `ChatMessage`: Individual chat bubbles
- `ChatInput`: User input with quick actions

### Services

- `ContentExtractor`: Analyzes page content
- `MockAIService`: Provides educational responses
- `TTSService`: Web Speech API wrapper

### Features

#### Content Extraction

- Automatically identifies page topics
- Assesses difficulty level
- Extracts key headings and content
- Handles course/program/tutorial contexts

#### AI Responses

- Context-aware explanations
- Suggested questions
- Educational examples
- Learning progression

#### Voice Features

- Multiple voice selection
- Automatic speech for responses
- Voice controls in header
- Browser compatibility checking

#### Avatar States

- `idle`: Default resting state
- `thinking`: Processing user input
- `speaking`: Text-to-speech active
- `listening`: Ready for input

## Customization

### Styling

Each component has its own CSS file for easy customization:

- `AITutorModal.css`: Main modal styles
- `AIAvatar.css`: Avatar animations
- `ChatMessage.css`: Chat bubble styles
- `ChatInput.css`: Input and quick actions

### AI Service

Replace `MockAIService` with real AI integration:

```tsx
// Create custom AI service implementing same interface
class CustomAIService {
  async analyzeContent(content: PageContent): Promise<EducationalExplanation> {
    // Your AI API integration
  }

  async generateResponse(
    question: string,
    context: PageContent
  ): Promise<string> {
    // Your AI API integration
  }
}
```

### Content Extraction

Customize content selectors for your site:

```tsx
const options = {
  prioritySelectors: [
    ".course-content",
    ".program-details",
    "main[data-content]",
  ],
  maxContentLength: 2000,
  includeLinks: true,
};

const content = ContentExtractor.extractPageContent(options);
```

## Browser Support

- **Text-to-Speech**: Chrome 33+, Firefox 49+, Safari 7+
- **CSS Animations**: All modern browsers
- **Modal**: All browsers with CSS Grid support

## Performance

- Lazy component loading
- Efficient content extraction
- Minimal re-renders with React.memo
- Optimized animations
- Accessibility considerations

## Future Upgrades

The system is designed for easy upgrades:

1. **Real AI APIs**: Replace MockAIService with OpenAI, Anthropic, etc.
2. **Advanced Avatars**: Add Lottie animations or 3D avatars
3. **Voice Input**: Add speech recognition
4. **Personalization**: User learning profiles
5. **Analytics**: Learning progress tracking

## Dependencies

Current implementation uses only:

- React hooks and built-in APIs
- CSS animations
- Web Speech API (browser native)
- No external libraries required

This makes it lightweight and easily maintainable while providing a solid foundation for future enhancements.

## Integration Checklist

- [ ] Import AITutorModal in header component
- [ ] Connect to AI mode toggle state
- [ ] Test content extraction on different pages
- [ ] Verify voice functionality in target browsers
- [ ] Customize styling to match site theme
- [ ] Test responsive behavior
- [ ] Verify accessibility features

The system is ready for immediate use with mock responses and can be gradually enhanced with real AI services as needed.
