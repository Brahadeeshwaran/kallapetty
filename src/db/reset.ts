import sql from '../models/db';
import fs from 'fs';
import path from 'path';

async function reset() {
  console.log('Resetting database...');

  try {
    console.log('Dropping public schema...');
    // Drop all tables in the public schema by dropping and recreating the schema
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO postgres`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    // Execute raw SQL file
    await sql.unsafe(schemaSql);
    
    console.log('Database reset successfully. Tables created.');
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

reset();
