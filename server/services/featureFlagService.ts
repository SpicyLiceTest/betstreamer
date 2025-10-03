import { storage } from "../storage";
import { auditService } from "./auditService";

class FeatureFlagService {
  private cache = new Map<string, boolean>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async isEnabled(flagKey: string, defaultValue: boolean = false): Promise<boolean> {
    // Check cache first
    const cachedValue = this.cache.get(flagKey);
    const expiry = this.cacheExpiry.get(flagKey);
    
    if (cachedValue !== undefined && expiry && Date.now() < expiry) {
      return cachedValue;
    }

    // Fetch from database
    try {
      const flag = await storage.getFeatureFlag(flagKey);
      const isEnabled = flag ? flag.enabled : defaultValue;
      
      // Update cache
      this.cache.set(flagKey, isEnabled);
      this.cacheExpiry.set(flagKey, Date.now() + this.CACHE_TTL);
      
      return isEnabled;
    } catch (error) {
      console.error(`Error fetching feature flag ${flagKey}:`, error);
      return defaultValue;
    }
  }

  async setFlag(flagKey: string, enabled: boolean, description?: string): Promise<void> {
    try {
      await storage.upsertFeatureFlag({
        key: flagKey,
        enabled,
        description: description || `Feature flag: ${flagKey}`,
        scope: "global",
        defaultValue: false,
      });

      // Clear cache
      this.cache.delete(flagKey);
      this.cacheExpiry.delete(flagKey);

      await auditService.log("system", "feature_flag_updated", "feature_flag", flagKey, {
        enabled,
        description,
      });
    } catch (error) {
      console.error(`Error setting feature flag ${flagKey}:`, error);
      throw error;
    }
  }

  async initializeDefaultFlags(): Promise<void> {
    const defaultFlags = [
      {
        key: "auto_placement",
        enabled: false,
        description: "Enable automated bet placement (experimental)",
      },
      {
        key: "aggressive_polling",
        enabled: false,
        description: "Enable high-frequency odds polling",
      },
      {
        key: "live_hedging",
        enabled: true,
        description: "Enable real-time hedge monitoring",
      },
      {
        key: "email_notifications",
        enabled: false,
        description: "Enable email notifications for alerts",
      },
      {
        key: "webhook_notifications",
        enabled: false,
        description: "Enable webhook notifications",
      },
    ];

    for (const flag of defaultFlags) {
      const existing = await storage.getFeatureFlag(flag.key);
      if (!existing) {
        await storage.upsertFeatureFlag({
          key: flag.key,
          enabled: flag.enabled,
          description: flag.description,
          scope: "global",
          defaultValue: flag.enabled,
        });
      }
    }

    await auditService.log("system", "default_feature_flags_initialized", "system", null, {
      flagsCount: defaultFlags.length,
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const featureFlagService = new FeatureFlagService();
