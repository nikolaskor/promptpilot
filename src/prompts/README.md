# PromptPilot Prompt Templates

This directory contains the prompt templates used by PromptPilot to improve user prompts.

## Files

- `improve.ts` - Contains the main templates for improving prompts
- `openai.ts` - Utilities for making OpenAI API calls with error handling

## Usage

### Improving Prompts

The main prompt template is designed to instruct the AI to improve prompts by:

1. Adding specificity and context where needed
2. Improving clarity and removing ambiguity
3. Structuring the prompt logically with clear instructions
4. Adding relevant constraints or requirements
5. Maintaining the original intent and key information
6. Using appropriate tone for the context
7. Breaking down complex requests into manageable parts
8. Including examples where helpful
9. For creative tasks, being clear about style, format, and audience

### Example

```typescript
import { createImprovePromptTemplate } from "./prompts/improve";

// Original prompt
const originalPrompt = "Write me a blog post about AI";

// Create the template
const template = createImprovePromptTemplate(originalPrompt);

console.log(template.system); // System message for OpenAI
console.log(template.user); // User message for OpenAI
```

## Adding New Templates

When adding new templates, follow these guidelines:

1. Create a clear, focused template that addresses a specific use case
2. Add appropriate JSDoc comments
3. Export the template function
4. Consider both detailed and concise versions for different contexts
5. Update this README with information about the new template
