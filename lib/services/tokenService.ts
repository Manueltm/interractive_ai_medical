//C:\Users\User\Desktop\Cloned\hume-voice-simulator\lib\services\tokenService.ts
import { db } from '@/lib/db/server-db'; // Use server-only DB client
import { tokenTransaction, tokenUsageRate, user, payment, tokenPrice } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class TokenService {
  // Get user token balance
  static async getUserBalance(userId: string): Promise<number> {
  try {
    const [userData] = await db
      .select({ tokenBalance: user.tokenBalance })
      .from(user)
      .where(eq(user.id, userId));
    
    return userData?.tokenBalance || 0;
  } catch (error) {
    console.error('❌ Error getting user balance:', error);
    return 0;
  }
}

  // Check if user has sufficient tokens
  static async hasSufficientTokens(userId: string, requiredTokens: number): Promise<boolean> {
    try {
      const balance = await this.getUserBalance(userId);
      return balance >= requiredTokens;
    } catch (error) {
      console.error('❌ Error checking token sufficiency:', error);
      return false; // Return false on error to prevent unintended access
    }
  }

  // Deduct tokens for a service
  // In your TokenService.deductTokens method, add this after successful deduction:
// In lib/services/tokenService.ts - update deductTokens method
static async deductTokens(
  userId: string, 
  service: string, 
  quantity: number, 
  metadata?: any
): Promise<{ success: boolean; transactionId?: string; message?: string; newBalance?: number }> {
  try {
    console.log(`🔐 Token deduction attempt: ${service} for user ${userId}, quantity: ${quantity}`);

    // Special handling for smart question generation
    if (service === 'smart_question_generation') {
      const tokensToDeduct = 5; // Fixed 5 tokens for smart generation
      console.log(`💰 Smart question generation tokens: ${tokensToDeduct}`);
      
      // Check balance
      const hasTokens = await this.hasSufficientTokens(userId, tokensToDeduct);
      if (!hasTokens) {
        const balance = await this.getUserBalance(userId);
        console.error(`❌ Insufficient tokens: ${balance} available, ${tokensToDeduct} required`);
        return { success: false, message: 'Insufficient tokens' };
      }

      let newBalance = 0;
      
      // Start transaction
      await db.transaction(async (tx) => {
        // Get current balance first
        const [currentUser] = await tx
          .select({ tokenBalance: user.tokenBalance })
          .from(user)
          .where(eq(user.id, userId));

        newBalance = (currentUser?.tokenBalance || 0) - tokensToDeduct;
        
        // Deduct from user balance
        await tx
          .update(user)
          .set({ tokenBalance: newBalance })
          .where(eq(user.id, userId));

        // Create transaction record
        await tx.insert(tokenTransaction).values({
          id: uuidv4(),
          userId,
          type: 'usage',
          amount: -tokensToDeduct, 
          description: `Smart question generation - 1 session`,
          reference: `smart_gen_${uuidv4()}`,
          metadata: {
            service: 'smart_question_generation',
            quantity: 1,
            unit: 'generation',
            rate: 5,
            ...metadata
          }
        });
      });

      console.log(`✅ Tokens deducted successfully. New balance: ${newBalance}`);
      
      return { 
        success: true, 
        transactionId: uuidv4(),
        newBalance
      };
    }
    
    // Get usage rate for other services
    const [rate] = await db
      .select()
      .from(tokenUsageRate)
      .where(and(
        eq(tokenUsageRate.service, service),
        eq(tokenUsageRate.isActive, true)
      ));

    if (!rate) {
      console.error(`❌ Service rate not found for: ${service}`);
      return { success: false, message: 'Service rate not found' };
    }

    const tokensToDeduct = Number(rate.rate) * quantity;
    console.log(`💰 Tokens to deduct: ${tokensToDeduct} (rate: ${rate.rate} * quantity: ${quantity})`);
    
    // Check balance
    const hasTokens = await this.hasSufficientTokens(userId, tokensToDeduct);
    if (!hasTokens) {
      const balance = await this.getUserBalance(userId);
      console.error(`❌ Insufficient tokens: ${balance} available, ${tokensToDeduct} required`);
      return { success: false, message: 'Insufficient tokens' };
    }

    let newBalance = 0;
    
    // Start transaction
    await db.transaction(async (tx) => {
      // Get current balance first
      const [currentUser] = await tx
        .select({ tokenBalance: user.tokenBalance })
        .from(user)
        .where(eq(user.id, userId));

      newBalance = (currentUser?.tokenBalance || 0) - tokensToDeduct;
      
      // Deduct from user balance
      await tx
        .update(user)
        .set({ tokenBalance: newBalance })
        .where(eq(user.id, userId));

      // Create transaction record
      await tx.insert(tokenTransaction).values({
        id: uuidv4(),
        userId,
        type: 'usage',
        amount: -tokensToDeduct, 
        description: `${service} - ${quantity} ${rate.unit}`,
        reference: `usage_${uuidv4()}`,
        metadata: {
          service,
          quantity,
          unit: rate.unit,
          rate: Number(rate.rate),
          ...metadata
        }
      });
    });

    console.log(`✅ Tokens deducted successfully. New balance: ${newBalance}`);
    
    return { 
      success: true, 
      transactionId: uuidv4(),
      newBalance
    };
  } catch (error) {
    console.error('❌ Error deducting tokens:', error);
    return { 
      success: false, 
      message: 'Token service temporarily unavailable' 
    };
  }
}



  // Add tokens (for purchases or rewards)
  static async addTokens(
    userId: string,
    amount: number,
    type: 'purchase' | 'reward',
    description: string,
    reference: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      console.log(`💰 Adding tokens: ${amount} to user ${userId}, type: ${type}`);

      await db.transaction(async (tx) => {
        // Add to user balance
        await tx
          .update(user)
          .set({ tokenBalance: sql`${user.tokenBalance} + ${amount}` })
          .where(eq(user.id, userId));

        // Create transaction record
        await tx.insert(tokenTransaction).values({
          id: uuidv4(),
          userId,
          type,
          amount,
          description,
          reference,
          metadata
        });
      });

      const newBalance = await this.getUserBalance(userId);
      console.log(`✅ Tokens added successfully. New balance: ${newBalance}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error adding tokens:', error);
      return false;
    }
  }

  // Get token usage rates
  static async getUsageRates() {
    try {
      return await db
        .select()
        .from(tokenUsageRate)
        .where(eq(tokenUsageRate.isActive, true));
    } catch (error) {
      console.error('❌ Error getting usage rates:', error);
      return []; // Return empty array on error
    }
  }

  // Add this method to TokenService class
static async reserveTokens(
  userId: string, 
  service: string, 
  maxQuantity: number
): Promise<{ success: boolean; reservedAmount: number; message?: string }> {
  try {
    console.log(`🔐 Token reservation attempt: ${service} for user ${userId}, max quantity: ${maxQuantity}`);

    // Get usage rate
    const [rate] = await db
      .select()
      .from(tokenUsageRate)
      .where(and(
        eq(tokenUsageRate.service, service),
        eq(tokenUsageRate.isActive, true)
      ));

    if (!rate) {
      console.error(`❌ Service rate not found for: ${service}`);
      return { success: false, reservedAmount: 0, message: 'Service rate not found' };
    }

    const maxTokensToReserve = Number(rate.rate) * maxQuantity;
    
    // Check if user has sufficient tokens for maximum possible usage
    const hasTokens = await this.hasSufficientTokens(userId, maxTokensToReserve);
    if (!hasTokens) {
      const balance = await this.getUserBalance(userId);
      console.error(`❌ Insufficient tokens for reservation: ${balance} available, ${maxTokensToReserve} maximum required`);
      return { 
        success: false, 
        reservedAmount: 0, 
        message: `Insufficient tokens. You need at least ${maxTokensToReserve} tokens for this session` 
      };
    }

    console.log(`✅ Tokens reserved successfully. Max tokens: ${maxTokensToReserve}`);
    
    return { 
      success: true, 
      reservedAmount: maxTokensToReserve,
      message: `Up to ${maxTokensToReserve} tokens reserved for this session` 
    };
  } catch (error) {
    console.error('❌ Error reserving tokens:', error);
    return { 
      success: false, 
      reservedAmount: 0,
      message: 'Token reservation service temporarily unavailable' 
    };
  }
}

  // Get user transaction history
  static async getUserTransactions(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const transactions = await db
        .select()
        .from(tokenTransaction)
        .where(eq(tokenTransaction.userId, userId))
        .orderBy(desc(tokenTransaction.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tokenTransaction)
        .where(eq(tokenTransaction.userId, userId));

      return {
        transactions,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCount: count
      };
    } catch (error) {
      console.error('❌ Error getting user transactions:', error);
      return {
        transactions: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0
      };
    }
  }

  // Get user payment history
  static async getUserPayments(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const payments = await db
        .select({
          id: payment.id,
          amount: payment.amount,
          tokenAmount: payment.tokenAmount,
          status: payment.status,
          reference: payment.reference,
          paystackReference: payment.paystackReference,
          createdAt: payment.createdAt,
          tokenPrice: {
            name: tokenPrice.name,
            description: tokenPrice.description
          }
        })
        .from(payment)
        .leftJoin(tokenPrice, eq(payment.tokenPriceId, tokenPrice.id))
        .where(eq(payment.userId, userId))
        .orderBy(desc(payment.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(payment)
        .where(eq(payment.userId, userId));

      return {
        payments,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCount: count
      };
    } catch (error) {
      console.error('❌ Error getting user payments:', error);
      return {
        payments: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0
      };
    }
  }

  // Get available token packages
  static async getTokenPackages() {
    try {
      return await db
        .select()
        .from(tokenPrice)
        .where(eq(tokenPrice.isActive, true))
        .orderBy(tokenPrice.tokenAmount);
    } catch (error) {
      console.error('❌ Error getting token packages:', error);
      return []; // Return empty array on error
    }
  }

  // Initialize default usage rates (run once by superadmin)
  static async initializeDefaultRates() {
    try {
      const defaultRates = [
        { service: 'flashcard_question', rate: 1.5, unit: 'question', description: 'Flashcard question generation' },
        { service: 'osce_session', rate: 0.1, unit: 'second', description: 'OSCE voice session per second' },
        { service: 'cbt_explanation', rate: 0.05, unit: 'word', description: 'CBT AI explanation per word' },
        { service: 'osce_analysis', rate: 2, unit: 'analysis', description: 'OSCE session analysis' },
      ];

      for (const rate of defaultRates) {
        await db
          .insert(tokenUsageRate)
          .values({
            id: uuidv4(),
            ...rate
          })
          .onConflictDoUpdate({
            target: tokenUsageRate.service,
            set: rate
          });
      }

      console.log('✅ Default token usage rates initialized');
    } catch (error) {
      console.error('❌ Error initializing default rates:', error);
      throw error; // Re-throw for admin to handle
    }
  }

  static async checkTokenBalance(userId: string): Promise<{ balance: number; canProceed: boolean }> {
  try {
    const balance = await this.getUserBalance(userId);
    return {
      balance,
      canProceed: balance > 0
    };
  } catch (error) {
    console.error('Error checking token balance:', error);
    return { balance: 0, canProceed: false };
  }
}

static async getServiceRate(service: string): Promise<number> {
  try {
    const [rate] = await db
      .select()
      .from(tokenUsageRate)
      .where(and(
        eq(tokenUsageRate.service, service),
        eq(tokenUsageRate.isActive, true)
      ));
    
    return rate ? Number(rate.rate) : 0;
  } catch (error) {
    console.error('Error getting service rate:', error);
    return 0;
  }
}

  // Initialize default token packages (run once by superadmin)
  static async initializeDefaultPackages() {
    try {
      const defaultPackages = [
        { name: 'Starter Pack', description: 'Perfect for getting started', tokenAmount: 100, price: 1000 }, // ₦10
        { name: 'Student Pack', description: 'Great for regular use', tokenAmount: 500, price: 4500 }, // ₦45
        { name: 'Professional Pack', description: 'For heavy users', tokenAmount: 1000, price: 8000 }, // ₦80
        { name: 'Institution Pack', description: 'Maximum value', tokenAmount: 5000, price: 35000 }, // ₦350
      ];

      for (const pkg of defaultPackages) {
        await db
          .insert(tokenPrice)
          .values({
            id: uuidv4(),
            ...pkg
          })
          .onConflictDoUpdate({
            target: tokenPrice.name,
            set: pkg
          });
      }

      console.log('✅ Default token packages initialized');
    } catch (error) {
      console.error('❌ Error initializing default packages:', error);
      throw error; // Re-throw for admin to handle
    }
  }
}