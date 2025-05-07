import { sql } from 'drizzle-orm';
import { db } from '../db';
import { apartments } from '../shared/schema';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Create apartments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "apartments" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "price" DECIMAL(10, 2) NOT NULL,
        "address" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "zip" TEXT NOT NULL,
        "bedrooms" INTEGER NOT NULL DEFAULT 1,
        "bathrooms" DECIMAL(3, 1) NOT NULL DEFAULT '1.0',
        "square_feet" INTEGER,
        "available" BOOLEAN DEFAULT true,
        "available_from" TIMESTAMP,
        "pet_friendly" BOOLEAN DEFAULT false,
        "furnished" BOOLEAN DEFAULT false,
        "parking" BOOLEAN DEFAULT false,
        "air_conditioning" BOOLEAN DEFAULT false,
        "view_count" INTEGER DEFAULT 0,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();