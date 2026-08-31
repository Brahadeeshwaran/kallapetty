import sql from '../models/db';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Business, User } from '../models/types';

dotenv.config();

const MASTER_BUSINESS_NAME = process.env.MASTER_BUSINESS_NAME || 'KallaPetty Master';
const MASTER_BUSINESS_OWNER_PHONE = process.env.MASTER_BUSINESS_OWNER_PHONE || '8667036987';
const SUPERADMIN_PHONE = process.env.SUPERADMIN_PHONE || '8667036987';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'qwertyuiopasdfghjklzxcvbnm';

async function seed() {
  console.log('Seeding database...');
  
  try {
    const existingBusiness = await sql<Business[]>`SELECT * FROM businesses WHERE owner_phone = ${MASTER_BUSINESS_OWNER_PHONE}`;
    
    let businessId: string;

    if (existingBusiness.length === 0) {
      console.log('Creating Master Business...');
      const result = await sql<Business[]>`
        INSERT INTO businesses (name, owner_phone, is_active)
        VALUES (${MASTER_BUSINESS_NAME}, ${MASTER_BUSINESS_OWNER_PHONE}, true)
        RETURNING id
      `;
      businessId = result[0].id;
    } else {
      console.log('Master Business already exists.');
      businessId = existingBusiness[0].id;
    }

    const existingAdmin = await sql<User[]>`SELECT * FROM users WHERE phone = ${SUPERADMIN_PHONE}`;
    
    if (existingAdmin.length === 0) {
      console.log('Creating Superadmin user...');
      const pass_hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
      await sql`
        INSERT INTO users (business_id, phone, pass_hash, is_superadmin, is_business_owner, full_name, is_active)
        VALUES (${businessId}, ${SUPERADMIN_PHONE}, ${pass_hash}, true, true, 'Super Admin', true)
      `;
      console.log('Superadmin user created.');
    } else {
      console.log('Superadmin user already exists.');
    }

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
