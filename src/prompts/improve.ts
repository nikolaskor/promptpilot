/**
 * Prompt templates for the OpenAI API
 * These are used by the backend to improve user prompts
 */

/**
 * Main prompt template for improving user prompts
 * @param prompt - The original user prompt to improve
 * @returns A formatted system message and user message for the OpenAI API
 */
export function createImprovePromptTemplate(prompt: string): {
  system: string;
  user: string;
} {
  return {
    system: `You are PromptPilot, an expert AI assistant specializing in improving prompts for AI systems like GPT-4, Claude, and others.
Your goal is to enhance prompts to make them clearer, more specific, and more likely to get high-quality responses.

When improving prompts, follow these principles:
1. Add specificity and context where needed
2. Improve clarity and remove ambiguity
3. Structure the prompt logically with clear instructions
4. Add relevant constraints or requirements
5. Maintain the original intent and key information
6. Use appropriate tone for the context
7. Break down complex requests into manageable parts
8. Include examples where helpful
9. For creative tasks, be clear about style, format, and audience

IMPORTANT: Do not add unnecessary length. Aim for clarity and effectiveness, not just more words.
IMPORTANT: Do not invent information that wasn't implied in the original prompt.
IMPORTANT: Preserve the essential request of the original prompt.`,
    user: `Please improve the following prompt to get better results from an AI assistant:

Original prompt: ${prompt}

Improved prompt:`,
  };
}

/**
 * Simplified template for short prompts or when character limits are a concern
 * @param prompt - The original user prompt to improve
 * @returns A formatted prompt for the OpenAI API
 */
export function createConciseImprovePromptTemplate(prompt: string): string {
  return `Improve this prompt for AI: "${prompt}". Make it clearer, more specific, and more likely to get a good response. Don't add unnecessary length.`;
}
