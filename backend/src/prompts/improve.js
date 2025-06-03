/**
 * Prompt templates for the OpenAI API
 * These are used by the backend to improve user prompts
 */

// Intent-specific guidance for prompt improvement
const INTENT_GUIDANCE = {
  Academic: {
    focus: "academic rigor, scholarly language, and research-oriented clarity",
    instructions: `
- Use formal, scholarly language appropriate for academic contexts
- Structure the prompt with clear research questions or hypotheses
- Include specificity about methodology, scope, and expected outcomes
- Add context about academic discipline or field of study
- Request citations, evidence, or theoretical frameworks when relevant
- Ensure the prompt encourages critical thinking and analysis`,
  },
  Professional: {
    focus: "business clarity, professional tone, and actionable outcomes",
    instructions: `
- Use clear, professional business language
- Structure with specific objectives and deliverables
- Include context about stakeholders, timeline, and constraints
- Focus on actionable outcomes and measurable results
- Add relevant business context (industry, company size, market position)
- Ensure the prompt drives toward practical, implementable solutions`,
  },
  Creative: {
    focus: "imaginative expression, artistic vision, and creative exploration",
    instructions: `
- Encourage vivid, descriptive language and creative expression
- Include specific details about style, tone, genre, or artistic medium
- Add context about target audience and emotional impact
- Request examples, inspiration sources, or creative constraints
- Focus on originality, innovation, and artistic merit
- Ensure the prompt sparks imagination and creative thinking`,
  },
  Technical: {
    focus: "precision, technical accuracy, and implementation details",
    instructions: `
- Use precise, technical language appropriate for the domain
- Include specific technical requirements, constraints, and parameters
- Add context about system architecture, technologies, or platforms
- Request detailed specifications, code examples, or technical documentation
- Focus on accuracy, efficiency, and best practices
- Ensure the prompt addresses implementation challenges and solutions`,
  },
  Personal: {
    focus: "conversational tone, personal relevance, and relatable guidance",
    instructions: `
- Use warm, conversational language that feels personal and approachable
- Include context about personal goals, preferences, and circumstances
- Add relevant personal details that make the response more tailored
- Request practical advice that fits into everyday life
- Focus on actionable steps that feel manageable and realistic
- Ensure the prompt encourages personalized, empathetic responses`,
  },
};

/**
 * Intent-based prompt template for improving user prompts
 * @param {string} prompt - The original user prompt to improve
 * @param {string} intent - The user's selected intent (Academic, Professional, Creative, Technical, Personal)
 * @returns {Object} A formatted system message and user message for the OpenAI API
 */
export function createIntentBasedImprovePromptTemplate(
  prompt,
  intent = "general"
) {
  const intentConfig = INTENT_GUIDANCE[intent];

  let systemPrompt = `You are PromptPilot, an expert AI assistant specializing in improving prompts for AI systems like GPT-4, Claude, and others.
Your goal is to enhance prompts to make them clearer, more specific, and more likely to get high-quality responses.`;

  if (intentConfig) {
    systemPrompt += `

INTENT-SPECIFIC OPTIMIZATION:
You are optimizing this prompt specifically for ${intent.toLowerCase()} purposes, focusing on ${
      intentConfig.focus
    }.

${intent.toUpperCase()} IMPROVEMENT GUIDELINES:${intentConfig.instructions}

GENERAL PRINCIPLES (apply alongside intent-specific guidelines):`;
  } else {
    systemPrompt += `

GENERAL IMPROVEMENT PRINCIPLES:`;
  }

  systemPrompt += `
1. Add specificity and context where needed
2. Improve clarity and remove ambiguity
3. Structure the prompt logically with clear instructions
4. Add relevant constraints or requirements
5. Maintain the original intent and key information
6. Use appropriate tone for the context
7. Break down complex requests into manageable parts
8. Include examples where helpful

IMPORTANT: Do not add unnecessary length. Aim for clarity and effectiveness, not just more words.
IMPORTANT: Do not invent information that wasn't implied in the original prompt.
IMPORTANT: Preserve the essential request of the original prompt while enhancing it for ${
    intent || "general"
  } use.`;

  return {
    system: systemPrompt,
    user: `Please improve the following prompt to get better results from an AI assistant, optimized for ${
      intent || "general"
    } purposes:

Original prompt: ${prompt}

Improved prompt:`,
  };
}

/**
 * Main prompt template for improving user prompts (backward compatibility)
 * @param {string} prompt - The original user prompt to improve
 * @returns {Object} A formatted system message and user message for the OpenAI API
 */
export function createImprovePromptTemplate(prompt) {
  return createIntentBasedImprovePromptTemplate(prompt, "general");
}

/**
 * Simplified template for short prompts or when character limits are a concern
 * @param {string} prompt - The original user prompt to improve
 * @returns {string} A formatted prompt for the OpenAI API
 */
export function createConciseImprovePromptTemplate(prompt) {
  return `Improve this prompt for AI: "${prompt}". Make it clearer, more specific, and more likely to get a good response. Don't add unnecessary length.`;
}
