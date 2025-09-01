// User Repository Implementation
import { IUserRepository } from '../../domain/repositories/IChatRepository';
import { User } from '../../domain/entities/Message';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Check if email already exists
    if (this.emailIndex.has(userData.email)) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      ...userData,
      id: uuidv4(),
      createdAt: new Date()
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    // If email is being updated, update the index
    if (updates.email && updates.email !== user.email) {
      if (this.emailIndex.has(updates.email)) {
        throw new Error('Email already in use');
      }
      this.emailIndex.delete(user.email);
      this.emailIndex.set(updates.email, id);
    }

    const updatedUser = {
      ...user,
      ...updates
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.emailIndex.delete(user.email);
      this.users.delete(id);
    }
  }

  // Additional utility methods
  async findByRole(role: User['role']): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async count(): Promise<number> {
    return this.users.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.users.has(id);
  }

  async emailExists(email: string): Promise<boolean> {
    return this.emailIndex.has(email);
  }
}