/**
 * Analytics and usage tracking types for PromptPilot
 */

export interface UserSettings {
  selectedIntent:
    | "academic"
    | "professional"
    | "creative"
    | "technical"
    | "personal"
    | "general";
  usageCount: number;
  subscriptionStatus: "free" | "premium" | "lifetime";
  lastResetDate: Date;
  monthlyLimit: number;
  userId?: string;
  installDate: Date;
  lastActiveDate: Date;
}

export interface PromptImprovement {
  id: string;
  originalPrompt: string;
  improvedPrompt: string;
  intent: string;
  timestamp: Date;
  modelUsed: string;
  originalLength: number;
  improvedLength: number;
  platform: string;
  processingTimeMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface UsageAnalytics {
  totalImprovements: number;
  improvementsThisMonth: number;
  averagePromptLength: number;
  averageImprovementLength: number;
  mostUsedIntent: string;
  mostUsedPlatform: string;
  averageProcessingTime: number;
  successRate: number;
  lastCalculated: Date;
}

export interface MonthlyUsage {
  month: string; // YYYY-MM format
  count: number;
  resetDate: Date;
}

export interface StorageKeys {
  USER_SETTINGS: "promptpilot_user_settings";
  PROMPT_HISTORY: "promptpilot_prompt_history";
  USAGE_ANALYTICS: "promptpilot_usage_analytics";
  MONTHLY_USAGE: "promptpilot_monthly_usage";
}

export const STORAGE_KEYS: StorageKeys = {
  USER_SETTINGS: "promptpilot_user_settings",
  PROMPT_HISTORY: "promptpilot_prompt_history",
  USAGE_ANALYTICS: "promptpilot_usage_analytics",
  MONTHLY_USAGE: "promptpilot_monthly_usage",
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  selectedIntent: "general",
  usageCount: 0,
  subscriptionStatus: "free",
  lastResetDate: new Date(),
  monthlyLimit: 20,
  installDate: new Date(),
  lastActiveDate: new Date(),
};

export const DEFAULT_USAGE_ANALYTICS: UsageAnalytics = {
  totalImprovements: 0,
  improvementsThisMonth: 0,
  averagePromptLength: 0,
  averageImprovementLength: 0,
  mostUsedIntent: "general",
  mostUsedPlatform: "unknown",
  averageProcessingTime: 0,
  successRate: 100,
  lastCalculated: new Date(),
};
