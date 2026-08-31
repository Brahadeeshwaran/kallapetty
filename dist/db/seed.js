"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../models/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MASTER_BUSINESS_NAME = process.env.MASTER_BUSINESS_NAME || 'KallaPetty Master';
const MASTER_BUSINESS_OWNER_PHONE = process.env.MASTER_BUSINESS_OWNER_PHONE || '8667036987';
const SUPERADMIN_PHONE = process.env.SUPERADMIN_PHONE || '8667036987';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'qwertyuiopasdfghjklzxcvbnm';
async function seed() {
    console.log('Seeding database...');
    try {
        const existingBusiness = await (0, db_1.default) `SELECT * FROM businesses WHERE owner_phone = ${MASTER_BUSINESS_OWNER_PHONE}`;
        let businessId;
        if (existingBusiness.length === 0) {
            console.log('Creating Master Business...');
            const result = await (0, db_1.default) `
        INSERT INTO businesses (name, owner_phone, is_active)
        VALUES (${MASTER_BUSINESS_NAME}, ${MASTER_BUSINESS_OWNER_PHONE}, true)
        RETURNING id
      `;
            businessId = result[0].id;
        }
        else {
            console.log('Master Business already exists.');
            businessId = existingBusiness[0].id;
        }
        const existingAdmin = await (0, db_1.default) `SELECT * FROM users WHERE phone = ${SUPERADMIN_PHONE}`;
        if (existingAdmin.length === 0) {
            console.log('Creating Superadmin user...');
            const pass_hash = await bcrypt_1.default.hash(SUPERADMIN_PASSWORD, 10);
            await (0, db_1.default) `
        INSERT INTO users (business_id, phone, pass_hash, is_superadmin, is_business_owner, full_name, is_active)
        VALUES (${businessId}, ${SUPERADMIN_PHONE}, ${pass_hash}, true, true, 'Super Admin', true)
      `;
            console.log('Superadmin user created.');
        }
        else {
            console.log('Superadmin user already exists.');
        }
        console.log('Database seeded successfully.');
    }
    catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
}
seed();
