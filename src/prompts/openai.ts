/**
 * OpenAI API utilities
 * Handles API calls with proper error handling and retries
 */

type OpenAIError = {
  status: number;
  message: string;
  type: string;
  param?: string;
  code?: string;
};

type RetryConfig = {
  maxRetries: number;
  initialDelay: number;
  factor: number;
};

/**
 * Call the OpenAI API with error handling and retry logic
 * @param url - The OpenAI API endpoint
 * @param body - The request body
 * @param apiKey - The OpenAI API key
 * @param retryConfig - Configuration for retry logic
 * @returns The API response
 * @throws Error if all retries fail
 */
export async function callOpenAIWithRetry(
  url: string,
  body: any,
  apiKey: string,
  retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    factor: 2,
  }
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // If not the first attempt, wait before retrying
      if (attempt > 0) {
        const delay =
          retryConfig.initialDelay * Math.pow(retryConfig.factor, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retry attempt ${attempt} after ${delay}ms`);
      }

      // Make the API call
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Check for API errors
      if (!response.ok) {
        const error = data.error || {
          message: "Unknown API error",
          type: "api_error",
        };

        // Handle specific error types differently
        if (
          error.type === "insufficient_quota" ||
          error.code === "rate_limit_exceeded"
        ) {
          throw new Error(
            `OpenAI API rate limit or quota exceeded: ${error.message}`
          );
        } else if (response.status === 429) {
          throw new Error(
            "Too many requests to OpenAI API. Please try again later."
          );
        } else if (response.status >= 500) {
          throw new Error("OpenAI API server error. Please try again later.");
        } else {
          throw new Error(`OpenAI API error: ${error.message}`);
        }
      }

      return data;
    } catch (error) {
      lastError = error as Error;

      // If it's the last retry, or if it's not a retryable error, throw
      const message = (error as Error).message || "";
      const isRetryable =
        message.includes("rate_limit") ||
        message.includes("server error") ||
        message.includes("Too many requests");

      if (attempt === retryConfig.maxRetries || !isRetryable) {
        break;
      }
    }
  }

  // If we've exhausted all retries
  throw (
    lastError || new Error("Failed to call OpenAI API after multiple retries")
  );
}

/**
 * Call the OpenAI Chat Completions API
 * @param messages - The messages to send to the API
 * @param apiKey - The OpenAI API key
 * @param options - Additional options for the API call
 * @returns The API response
 */
export async function callChatCompletions(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<string> {
  try {
    const response = await callOpenAIWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        model: options.model || "gpt-3.5-turbo",
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
      },
      apiKey
    );

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling OpenAI Chat Completions API:", error);
    throw error;
  }
}
