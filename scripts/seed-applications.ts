import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { application } from "../lib/db/schema";
import { sql, eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("📁 Current working directory:", process.cwd());
console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL ? "Found" : "Not found");

const applications = [
  {
    name: "Clinchers",
    slug: "clincher",
    description: "Quick clinical pearls and high-yield facts for rapid revision",
    icon: "fa-lightbulb",
    color: "amber",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "QBlock",
    slug: "qblock",
    description: "Comprehensive question blocks for MBBS and MDCN preparation",
    icon: "fa-question-circle",
    color: "blue",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "CBT Examination",
    slug: "cbt-examination",
    description: "Computer-based testing environment for MDCN and MBBS exams",
    icon: "fa-laptop-medical",
    color: "purple",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "OSCE Practice",
    slug: "osce",
    description: "Objective Structured Clinical Examination practice scenarios",
    icon: "fa-stethoscope",
    color: "green",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "Flashcards",
    slug: "flashcards",
    description: "Interactive flashcards for medical terminology and concepts",
    icon: "fa-book-open",
    color: "orange",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Lecture Notes",
    slug: "lecture-notes",
    description: "Comprehensive medical lecture notes and study materials",
    icon: "fa-book",
    color: "red",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Randomizer",
    slug: "randomizer",
    description: "Random question generator for quick practice sessions",
    icon: "fa-random",
    color: "teal",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Checklist",
    slug: "checklist",
    description: "Medical procedures and clinical skills checklists",
    icon: "fa-check-circle",
    color: "emerald",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Mock Exams",
    slug: "mock",
    description: "Full-length mock examinations with time constraints",
    icon: "fa-laptop-medical",
    color: "indigo",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "QTopic",
    slug: "qtopic",
    description: "Topic-wise question banks for focused learning",
    icon: "fa-tag",
    color: "pink",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "Keypoint Lectures",
    slug: "keypoint-lectures",
    description: "Concise video lectures highlighting key medical concepts",
    icon: "fa-chalkboard-teacher",
    color: "cyan",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Courses",
    slug: "courses",
    description: "Structured medical courses with progress tracking",
    icon: "fa-layer-group",
    color: "violet",
    requiresApproval: true,
    isActive: true
  },
  {
    name: "Games",
    slug: "games",
    description: "Educational medical games for interactive learning",
    icon: "fa-gamepad",
    color: "rose",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
  {
    name: "Quiz",
    slug: "quiz",
    description: "Quick medical quizzes for daily practice",
    icon: "fa-question-circle",
    color: "sky",
    requiresApproval: true, // Changed from false to true
    isActive: true
  },
];

async function seedApplications() {
  console.log("🌱 Seeding/Updating applications...");
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL not found in environment variables!");
    console.error("Please make sure .env.local exists and contains DATABASE_URL");
    process.exit(1);
  }

  try {
    // Create connection with explicit parameters
    const client = postgres(connectionString, {
      host: 'localhost',
      port: 5432,
      database: 'patient_simulator',
      username: 'postgres',
      password: 'Passw0rd.',
    });
    
    const db = drizzle(client);
    
    // Test connection
    console.log("Testing database connection...");
    const result = await db.execute(sql`SELECT current_user, current_database();`);
    console.log("✅ Connected as:", result[0]?.current_user);
    console.log("Database:", result[0]?.current_database);

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'application'
      );
    `);
    
    if (!tableCheck[0]?.exists) {
      console.log("⚠️ Application table does not exist!");
      console.log("Please run database migrations first:");
      console.log("  npx drizzle-kit push");
      process.exit(1);
    }

    // First, show current data
    console.log("\n📊 Current applications in database:");
    const existingApps = await db.select({
      slug: application.slug,
      name: application.name,
      requiresApproval: application.requiresApproval
    }).from(application);
    
    existingApps.forEach(app => {
      console.log(`  ${app.name}: requiresApproval = ${app.requiresApproval}`);
    });

    console.log("\n🔄 Updating/Inserting applications...");
    let insertCount = 0;
    let updateCount = 0;
    
    for (const app of applications) {
      try {
        // Check if application exists
        const existing = await db.select()
          .from(application)
          .where(eq(application.slug, app.slug))
          .limit(1);

        if (existing.length > 0) {
          // Update existing application
          await db.update(application)
            .set({
              name: app.name,
              description: app.description,
              icon: app.icon,
              color: app.color,
              requiresApproval: app.requiresApproval,
              isActive: app.isActive,
              updatedAt: new Date()
            })
            .where(eq(application.slug, app.slug));
          
          console.log(`  🔄 Updated: ${app.name} (requiresApproval: ${app.requiresApproval})`);
          updateCount++;
        } else {
          // Insert new application
          await db.insert(application).values({
            ...app,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`  ✅ Inserted: ${app.name}`);
          insertCount++;
        }
      } catch (err) {
        console.error(`  ❌ Failed to process ${app.name}:`, err);
      }
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`   - ${insertCount} new applications inserted`);
    console.log(`   - ${updateCount} existing applications updated`);
    console.log(`   - Total: ${applications.length} applications processed`);
    
    // Show updated data
    console.log("\n📊 Updated applications in database:");
    const updatedApps = await db.select({
      slug: application.slug,
      name: application.name,
      requiresApproval: application.requiresApproval
    }).from(application);
    
    updatedApps.forEach(app => {
      console.log(`  ${app.name}: requiresApproval = ${app.requiresApproval}`);
    });
    
    await client.end();
    
  } catch (error) {
    console.error("❌ Error seeding applications:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  } finally {
    process.exit(0);
  }
}

seedApplications();