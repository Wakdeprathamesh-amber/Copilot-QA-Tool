import { db } from '../config/database';
import { User } from '../types';
import { logger } from '../utils/logger';

export class UserRepository {
  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.rowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT id, email, role, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.rowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  async create(email: string, passwordHash?: string, role: string = 'reviewer'): Promise<User> {
    try {
      const result = await db.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, created_at, updated_at`,
        [email, passwordHash, role]
      );
      
      return this.rowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error creating user', { email, error });
      throw error;
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }
      if (updates.role !== undefined) {
        fields.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }

      if (fields.length === 0) {
        return await this.findById(id) as User;
      }

      values.push(id);
      const result = await db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, email, role, created_at, updated_at`,
        values
      );

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user', { id, updates, error });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
