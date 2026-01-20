import { query } from '../db/connection';
import { QAAssessment } from '../types';
import { logger } from '../utils/logger';

// Default reviewer ID when auth is not available
const DEFAULT_REVIEWER_ID = 'system';

// Helper functions to convert between tags array and comma-separated string
const tagsToString = (tags: string[]): string => {
  return tags.filter(t => t.trim()).join(',');
};

const stringToTags = (tagsStr: string | null | undefined): string[] => {
  if (!tagsStr || tagsStr.trim() === '') return [];
  return tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
};

export const qaAssessmentRepository = {
  async get(conversationId: string): Promise<QAAssessment | null> {
    try {
      const result = await query(
        `SELECT 
          id,
          conversation_id,
          reviewer_id,
          rating,
          tags,
          notes,
          created_at,
          updated_at
        FROM qa_assessments 
        WHERE conversation_id = $1 
        ORDER BY updated_at DESC 
        LIMIT 1`,
        [conversationId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        conversationId: row.conversation_id,
        reviewerId: row.reviewer_id || DEFAULT_REVIEWER_ID,
        rating: row.rating || 'okay',
        tags: stringToTags(row.tags),
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Error fetching QA assessment', { conversationId, error });
      throw error;
    }
  },

  async setRating(conversationId: string, rating: 'good' | 'okay' | 'bad'): Promise<QAAssessment> {
    try {
      // Check if assessment exists
      const existing = await this.get(conversationId);
      
      if (existing) {
        // Update existing (Redshift doesn't support RETURNING in UPDATE, so we query after)
        await query(
          `UPDATE qa_assessments 
           SET rating = $1, updated_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $2`,
          [rating, conversationId]
        );
        
        // Fetch updated record
        const updated = await this.get(conversationId);
        if (!updated) {
          throw new Error('Failed to retrieve updated assessment');
        }
        return updated;
      } else {
        // Create new (Redshift doesn't support RETURNING in INSERT)
        const id = `qa_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        await query(
          `INSERT INTO qa_assessments (id, conversation_id, reviewer_id, rating, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, conversationId, DEFAULT_REVIEWER_ID, rating, '', null]
        );
        
        // Fetch the created record
        const created = await this.get(conversationId);
        if (!created) {
          throw new Error('Failed to retrieve created assessment');
        }
        return created;
      }
    } catch (error) {
      logger.error('Error setting rating', { conversationId, rating, error });
      throw error;
    }
  },

  async addTags(conversationId: string, tags: string[]): Promise<void> {
    try {
      // Get existing assessment
      const existing = await this.get(conversationId);
      
      if (!existing) {
        // Create new assessment with tags
        const id = `qa_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        await query(
          `INSERT INTO qa_assessments (id, conversation_id, reviewer_id, rating, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, conversationId, DEFAULT_REVIEWER_ID, 'okay', tagsToString(tags), null]
        );
      } else {
        // Merge new tags with existing tags
        const existingTags = existing.tags || [];
        const mergedTags = [...new Set([...existingTags, ...tags])];
        
        await query(
          `UPDATE qa_assessments 
           SET tags = $1, updated_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $2`,
          [tagsToString(mergedTags), conversationId]
        );
      }
    } catch (error) {
      logger.error('Error adding tags', { conversationId, tags, error });
      throw error;
    }
  },

  async removeTags(conversationId: string, tags: string[]): Promise<void> {
    try {
      const existing = await this.get(conversationId);
      
      if (existing) {
        const existingTags = existing.tags || [];
        const filteredTags = existingTags.filter(t => !tags.includes(t));
        
        await query(
          `UPDATE qa_assessments 
           SET tags = $1, updated_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $2`,
          [tagsToString(filteredTags), conversationId]
        );
      }
    } catch (error) {
      logger.error('Error removing tags', { conversationId, tags, error });
      throw error;
    }
  },

  async setNotes(conversationId: string, notes: string): Promise<QAAssessment> {
    try {
      // Get existing assessment
      const existing = await this.get(conversationId);
      
      if (!existing) {
        // Create new assessment with notes (Redshift doesn't support RETURNING in INSERT)
        const id = `qa_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        await query(
          `INSERT INTO qa_assessments (id, conversation_id, reviewer_id, rating, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, conversationId, DEFAULT_REVIEWER_ID, 'okay', '', notes]
        );
        
        // Fetch the created record
        const created = await this.get(conversationId);
        if (!created) {
          throw new Error('Failed to retrieve created assessment');
        }
        return created;
      } else {
        // Update existing (Redshift doesn't support RETURNING in UPDATE, so we query after)
        await query(
          `UPDATE qa_assessments 
           SET notes = $1, updated_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $2`,
          [notes, conversationId]
        );
        
        // Fetch updated record
        const updated = await this.get(conversationId);
        if (!updated) {
          throw new Error('Failed to retrieve updated assessment');
        }
        return updated;
      }
    } catch (error) {
      logger.error('Error setting notes', { conversationId, error });
      throw error;
    }
  },

  async update(conversationId: string, updates: { rating?: 'good' | 'okay' | 'bad'; tags?: string[]; notes?: string }): Promise<QAAssessment> {
    try {
      const existing = await this.get(conversationId);
      
      const rating = updates.rating !== undefined ? updates.rating : (existing?.rating || 'okay');
      const tags = updates.tags !== undefined ? updates.tags : (existing?.tags || []);
      const notes = updates.notes !== undefined ? updates.notes : (existing?.notes || null);
      
      if (!existing) {
        // Create new
        const id = `qa_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        await query(
          `INSERT INTO qa_assessments (id, conversation_id, reviewer_id, rating, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, conversationId, DEFAULT_REVIEWER_ID, rating, tagsToString(tags), notes]
        );
        
        // Fetch the created record
        const created = await this.get(conversationId);
        if (!created) {
          throw new Error('Failed to retrieve created assessment');
        }
        return created;
      } else {
        // Update existing (Redshift doesn't support RETURNING in UPDATE, so we query after)
        await query(
          `UPDATE qa_assessments 
           SET rating = $1, tags = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $4`,
          [rating, tagsToString(tags), notes, conversationId]
        );
        
        // Fetch updated record
        const updated = await this.get(conversationId);
        if (!updated) {
          throw new Error('Failed to retrieve updated assessment');
        }
        return updated;
      }
    } catch (error) {
      logger.error('Error updating assessment', { conversationId, updates, error });
      throw error;
    }
  },

  async getBulk(conversationIds: string[]): Promise<Record<string, QAAssessment | null>> {
    try {
      if (conversationIds.length === 0) {
        return {};
      }
      
      // Use IN clause for better Redshift compatibility
      // Create placeholders for each ID
      const placeholders = conversationIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(
        `SELECT 
          id,
          conversation_id,
          reviewer_id,
          rating,
          tags,
          notes,
          created_at,
          updated_at
        FROM qa_assessments 
        WHERE conversation_id IN (${placeholders})
        ORDER BY conversation_id, updated_at DESC`,
        conversationIds
      );
      
      // Create a map of conversation_id -> latest assessment
      const assessments: Record<string, QAAssessment | null> = {};
      
      // Initialize all to null
      conversationIds.forEach(id => {
        assessments[id] = null;
      });
      
      // Fill in found assessments (taking latest if duplicates)
      result.rows.forEach((row) => {
        const convId = row.conversation_id;
        if (!assessments[convId]) {
          assessments[convId] = {
            id: row.id,
            conversationId: row.conversation_id,
            reviewerId: row.reviewer_id || DEFAULT_REVIEWER_ID,
            rating: row.rating || 'okay',
            tags: stringToTags(row.tags),
            notes: row.notes || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
      });
      
      return assessments;
    } catch (error) {
      logger.error('Error fetching bulk QA assessments', { conversationIds, error });
      throw error;
    }
  },

  async setBulkRating(conversationIds: string[], rating: 'good' | 'okay' | 'bad'): Promise<Record<string, QAAssessment>> {
    try {
      const results: Record<string, QAAssessment> = {};
      
      // Use a transaction-like approach with individual updates
      // For better performance, we could use a single query with UNNEST, but this is clearer
      for (const conversationId of conversationIds) {
        results[conversationId] = await this.setRating(conversationId, rating);
      }
      
      return results;
    } catch (error) {
      logger.error('Error setting bulk rating', { conversationIds, rating, error });
      throw error;
    }
  },

  async addBulkTags(conversationIds: string[], tags: string[]): Promise<void> {
    try {
      // Process each conversation
      for (const conversationId of conversationIds) {
        await this.addTags(conversationId, tags);
      }
    } catch (error) {
      logger.error('Error adding bulk tags', { conversationIds, tags, error });
      throw error;
    }
  },

  async getAllTags(): Promise<string[]> {
    try {
      // Fetch all assessments and extract unique tags
      // Support both schemas:
      // - tags stored as VARCHAR(1000) with comma-separated values
      // - tags stored as TEXT[] (array)
      const result = await query(
        `SELECT tags FROM qa_assessments WHERE tags IS NOT NULL`,
        []
      );
      
      const allTagsSet = new Set<string>();
      
      result.rows.forEach((row) => {
        const rawTags = row.tags;
        let tags: string[] = [];

        if (Array.isArray(rawTags)) {
          // TEXT[] schema: tags already an array
          tags = rawTags.map((t: any) => String(t));
        } else if (typeof rawTags === 'string') {
          // VARCHAR schema: comma-separated string
          if (rawTags.trim() !== '') {
            tags = stringToTags(rawTags);
          }
        }

        tags.forEach(tag => {
          const cleaned = tag.trim();
          if (cleaned) {
            allTagsSet.add(cleaned);
          }
        });
      });
      
      // Return sorted array of unique tags
      return Array.from(allTagsSet).sort();
    } catch (error) {
      logger.error('Error fetching all tags', { error });
      throw error;
    }
  },
};
