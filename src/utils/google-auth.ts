/**
 * Google Authentication Service for Chrome Extension
 * Uses Chrome's identity API to authenticate users with their Google account
 */

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  id: string;
}

export class GoogleAuthService {
  /**
   * Sign in with Google and get user info
   * Uses Chrome's identity API for seamless authentication
   */
  static async signIn(): Promise<{
    success: boolean;
    user?: GoogleUser;
    error?: string;
  }> {
    try {
      console.log("Starting Google Sign-In...");

      // Get OAuth token using Chrome identity API
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Chrome identity error:",
              chrome.runtime.lastError.message
            );
            reject(new Error(chrome.runtime.lastError.message));
          } else if (token) {
            console.log("Successfully obtained auth token");
            resolve(token);
          } else {
            reject(new Error("No token received from Chrome identity API"));
          }
        });
      });

      console.log("Fetching user info from Google API...");

      // Get user info from Google API
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get user info from Google: ${response.status} ${response.statusText}`
        );
      }

      const userInfo = await response.json();
      console.log("Received user info from Google:", {
        email: userInfo.email,
        name: userInfo.name,
      });

      const user: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };

      // Store user info in Chrome storage for future use
      await chrome.storage.local.set({ googleUser: user });
      console.log("Stored user info in Chrome storage");

      return { success: true, user };
    } catch (error) {
      console.error("Google sign-in error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during Google sign-in",
      };
    }
  }

  /**
   * Get stored user info from Chrome storage
   */
  static async getStoredUser(): Promise<GoogleUser | null> {
    try {
      const result = await chrome.storage.local.get(["googleUser"]);
      const user = result.googleUser || null;

      if (user) {
        console.log("Found stored Google user:", {
          email: user.email,
          name: user.name,
        });
      } else {
        console.log("No stored Google user found");
      }

      return user;
    } catch (error) {
      console.error("Error getting stored user:", error);
      return null;
    }
  }

  /**
   * Sign out and clear stored data
   */
  static async signOut(): Promise<void> {
    try {
      console.log("Signing out Google user...");

      // Remove cached auth token
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (token) {
            resolve(token);
          } else {
            reject(new Error("No token to remove"));
          }
        });
      });

      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          console.log("Auth token removed from cache");
        });
      }

      // Clear stored user data
      await chrome.storage.local.remove(["googleUser"]);
      console.log("Cleared stored Google user data");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  /**
   * Check if user is currently signed in
   */
  static async isSignedIn(): Promise<boolean> {
    const user = await this.getStoredUser();
    return user !== null;
  }
}
