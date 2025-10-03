import { storage } from "../storage";
import crypto from "crypto";

class AuditService {
  async log(
    actor: string,
    action: string,
    targetType: string | null,
    targetId: string | null,
    payload: any = {}
  ): Promise<void> {
    try {
      const payloadString = JSON.stringify(payload);
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
      const payloadPreview = payloadString.length > 200 
        ? payloadString.substring(0, 200) + "..." 
        : payloadString;

      await storage.createAuditLog({
        actor,
        action,
        targetType,
        targetId,
        payloadHash,
        payloadPreview,
      });
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async logUserAction(
    userId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: any = {}
  ): Promise<void> {
    await this.log(userId, action, targetType, targetId, details);
  }

  async logSystemEvent(
    action: string,
    targetType: string | null = null,
    targetId: string | null = null,
    details: any = {}
  ): Promise<void> {
    await this.log("system", action, targetType, targetId, details);
  }

  async getRecentActivity(limit: number = 50): Promise<any[]> {
    const logs = await storage.getAuditLogs({
      since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    });

    return logs.slice(0, limit).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      actor: log.actor,
      action: log.action,
      target: log.targetType && log.targetId ? `${log.targetType}:${log.targetId}` : null,
      preview: log.payloadPreview,
    }));
  }

  async getUserActivity(userId: string, limit: number = 25): Promise<any[]> {
    const logs = await storage.getAuditLogs({
      actor: userId,
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    });

    return logs.slice(0, limit).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      target: log.targetType && log.targetId ? `${log.targetType}:${log.targetId}` : null,
      preview: log.payloadPreview,
    }));
  }
}

export const auditService = new AuditService();
