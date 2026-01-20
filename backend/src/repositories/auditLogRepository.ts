import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any> | null;
  createdAt: Date;
}

export class AuditLogRepository {
  async create(
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, any>
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, resourceType, resourceId, changes ? JSON.stringify(changes) : null]
      );
    } catch (error) {
      logger.error('Error creating audit log', { userId, action, resourceType, resourceId, error });
      // Don't throw - audit logging should not break the main flow
    }
  }

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    try {
      const result = await db.query(
        `SELECT * FROM audit_logs 
         WHERE resource_type = $1 AND resource_id = $2
         ORDER BY created_at DESC`,
        [resourceType, resourceId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        changes: row.changes,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Error finding audit logs', { resourceType, resourceId, error });
      throw error;
    }
  }
}

export const auditLogRepository = new AuditLogRepository();
