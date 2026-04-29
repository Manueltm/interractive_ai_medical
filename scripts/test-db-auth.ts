import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log("🔍 Testing database connection...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  
  // Try with explicit connection parameters
  const connectionString = process.env.DATABASE_URL!;
  
  try {
    // Create connection with explicit options
    const client = postgres(connectionString, {
      host: 'localhost',
      port: 5432,
      database: 'patient_simulator',
      username: 'postgres',  // Explicitly set username
      password: 'Passw0rd.',
    });
    
    const db = drizzle(client);
    
    const result = await db.execute(sql`SELECT current_user, current_database();`);
    console.log("✅ Connected successfully!");
    console.log("Current user:", result[0]?.current_user);
    console.log("Current database:", result[0]?.current_database);
    
    await client.end();
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();