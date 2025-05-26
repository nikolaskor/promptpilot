/**
 * Storage utilities for PromptPilot analytics and user data
 */

import {
  UserSettings,
  PromptImprovement,
  UsageAnalytics,
  MonthlyUsage,
  STORAGE_KEYS,
  DEFAULT_USER_SETTINGS,
  DEFAULT_USAGE_ANALYTICS,
} from "../types/analytics";

/**
 * Storage utility class for managing PromptPilot data
 */
export class AnalyticsStorage {
  /**
   * Get user settings from storage
   */
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_SETTINGS);
      const settings = result[STORAGE_KEYS.USER_SETTINGS];

      if (!settings) {
        // First time user - initialize with defaults
        const defaultSettings = {
          ...DEFAULT_USER_SETTINGS,
          installDate: new Date(),
          lastActiveDate: new Date(),
        };
        await this.saveUserSettings(defaultSettings);
        return defaultSettings;
      }

      // Convert date strings back to Date objects
      return {
        ...settings,
        lastResetDate: new Date(settings.lastResetDate),
        installDate: new Date(settings.installDate),
        lastActiveDate: new Date(settings.lastActiveDate),
      };
    } catch (error) {
      console.error("Error getting user settings:", error);
      return DEFAULT_USER_SETTINGS;
    }
  }

  /**
   * Save user settings to storage
   */
  static async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_SETTINGS]: settings,
      });
    } catch (error) {
      console.error("Error saving user settings:", error);
      throw error;
    }
  }

  /**
   * Update user settings partially
   */
  static async updateUserSettings(
    updates: Partial<UserSettings>
  ): Promise<UserSettings> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings = {
        ...currentSettings,
        ...updates,
        lastActiveDate: new Date(),
      };
      await this.saveUserSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  }

  /**
   * Check if user has reached their monthly limit
   */
  static async hasReachedLimit(): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();

      // Premium users have no limits
      if (
        settings.subscriptionStatus === "premium" ||
        settings.subscriptionStatus === "lifetime"
      ) {
        return false;
      }

      // Check if we need to reset monthly count
      const now = new Date();
      const lastReset = new Date(settings.lastResetDate);
      const monthsSinceReset =
        (now.getFullYear() - lastReset.getFullYear()) * 12 +
        (now.getMonth() - lastReset.getMonth());

      if (monthsSinceReset >= 1) {
        // Reset usage count for new month
        await this.updateUserSettings({
          usageCount: 0,
          lastResetDate: new Date(now.getFullYear(), now.getMonth(), 1),
        });
        return false;
      }

      return settings.usageCount >= settings.monthlyLimit;
    } catch (error) {
      console.error("Error checking usage limit:", error);
      return false; // Allow usage if we can't check
    }
  }

  /**
   * Get remaining improvements for the month
   */
  static async getRemainingImprovements(): Promise<number> {
    try {
      const settings = await this.getUserSettings();

      // Premium users have unlimited
      if (
        settings.subscriptionStatus === "premium" ||
        settings.subscriptionStatus === "lifetime"
      ) {
        return Infinity;
      }

      return Math.max(0, settings.monthlyLimit - settings.usageCount);
    } catch (error) {
      console.error("Error getting remaining improvements:", error);
      return 0;
    }
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(): Promise<void> {
    try {
      const settings = await this.getUserSettings();
      await this.updateUserSettings({
        usageCount: settings.usageCount + 1,
      });
    } catch (error) {
      console.error("Error incrementing usage:", error);
      throw error;
    }
  }

  /**
   * Save a prompt improvement record
   */
  static async savePromptImprovement(
    improvement: PromptImprovement
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get(
        STORAGE_KEYS.PROMPT_HISTORY
      );
      const history: PromptImprovement[] =
        result[STORAGE_KEYS.PROMPT_HISTORY] || [];

      // Add new improvement
      history.push(improvement);

      // Keep only last 1000 improvements to prevent storage bloat
      const maxHistory = 1000;
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.PROMPT_HISTORY]: history,
      });

      // Update analytics
      await this.updateAnalytics();
    } catch (error) {
      console.error("Error saving prompt improvement:", error);
      throw error;
    }
  }

  /**
   * Get prompt history
   */
  static async getPromptHistory(limit?: number): Promise<PromptImprovement[]> {
    try {
      const result = await chrome.storage.local.get(
        STORAGE_KEYS.PROMPT_HISTORY
      );
      const history: PromptImprovement[] =
        result[STORAGE_KEYS.PROMPT_HISTORY] || [];

      // Convert date strings back to Date objects
      const processedHistory = history.map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));

      // Sort by timestamp (newest first) and apply limit
      const sortedHistory = processedHistory.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      return limit ? sortedHistory.slice(0, limit) : sortedHistory;
    } catch (error) {
      console.error("Error getting prompt history:", error);
      return [];
    }
  }

  /**
   * Update usage analytics
   */
  static async updateAnalytics(): Promise<void> {
    try {
      const history = await this.getPromptHistory();
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter improvements for current month
      const thisMonthImprovements = history.filter((item) => {
        const itemDate = new Date(item.timestamp);
        return (
          itemDate.getMonth() === currentMonth &&
          itemDate.getFullYear() === currentYear
        );
      });

      // Calculate analytics
      const totalImprovements = history.length;
      const improvementsThisMonth = thisMonthImprovements.length;

      const successfulImprovements = history.filter((item) => item.success);
      const successRate =
        totalImprovements > 0
          ? (successfulImprovements.length / totalImprovements) * 100
          : 100;

      const averagePromptLength =
        totalImprovements > 0
          ? history.reduce((sum, item) => sum + item.originalLength, 0) /
            totalImprovements
          : 0;

      const averageImprovementLength =
        totalImprovements > 0
          ? history.reduce((sum, item) => sum + item.improvedLength, 0) /
            totalImprovements
          : 0;

      const averageProcessingTime =
        totalImprovements > 0
          ? history.reduce((sum, item) => sum + item.processingTimeMs, 0) /
            totalImprovements
          : 0;

      // Find most used intent and platform
      const intentCounts = history.reduce((acc, item) => {
        acc[item.intent] = (acc[item.intent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const platformCounts = history.reduce((acc, item) => {
        acc[item.platform] = (acc[item.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedIntent = Object.keys(intentCounts).reduce(
        (a, b) => (intentCounts[a] > intentCounts[b] ? a : b),
        "general"
      );

      const mostUsedPlatform = Object.keys(platformCounts).reduce(
        (a, b) => (platformCounts[a] > platformCounts[b] ? a : b),
        "unknown"
      );

      const analytics: UsageAnalytics = {
        totalImprovements,
        improvementsThisMonth,
        averagePromptLength,
        averageImprovementLength,
        mostUsedIntent,
        mostUsedPlatform,
        averageProcessingTime,
        successRate,
        lastCalculated: now,
      };

      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE_ANALYTICS]: analytics,
      });
    } catch (error) {
      console.error("Error updating analytics:", error);
    }
  }

  /**
   * Get usage analytics
   */
  static async getUsageAnalytics(): Promise<UsageAnalytics> {
    try {
      const result = await chrome.storage.local.get(
        STORAGE_KEYS.USAGE_ANALYTICS
      );
      const analytics = result[STORAGE_KEYS.USAGE_ANALYTICS];

      if (!analytics) {
        return DEFAULT_USAGE_ANALYTICS;
      }

      return {
        ...analytics,
        lastCalculated: new Date(analytics.lastCalculated),
      };
    } catch (error) {
      console.error("Error getting usage analytics:", error);
      return DEFAULT_USAGE_ANALYTICS;
    }
  }

  /**
   * Clear all analytics data (for testing or reset)
   */
  static async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.USER_SETTINGS,
        STORAGE_KEYS.PROMPT_HISTORY,
        STORAGE_KEYS.USAGE_ANALYTICS,
        STORAGE_KEYS.MONTHLY_USAGE,
      ]);
    } catch (error) {
      console.error("Error clearing analytics data:", error);
      throw error;
    }
  }

  /**
   * Export analytics data for debugging
   */
  static async exportData(): Promise<{
    userSettings: UserSettings;
    promptHistory: PromptImprovement[];
    usageAnalytics: UsageAnalytics;
  }> {
    try {
      const [userSettings, promptHistory, usageAnalytics] = await Promise.all([
        this.getUserSettings(),
        this.getPromptHistory(),
        this.getUsageAnalytics(),
      ]);

      return {
        userSettings,
        promptHistory,
        usageAnalytics,
      };
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  }
}
