"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../models/db"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function reset() {
    console.log('Resetting database...');
    try {
        console.log('Dropping public schema...');
        // Drop all tables in the public schema by dropping and recreating the schema
        await (0, db_1.default) `DROP SCHEMA public CASCADE`;
        await (0, db_1.default) `CREATE SCHEMA public`;
        await (0, db_1.default) `GRANT ALL ON SCHEMA public TO postgres`;
        await (0, db_1.default) `GRANT ALL ON SCHEMA public TO public`;
        console.log('Reading schema.sql...');
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema.sql...');
        // Execute raw SQL file
        await db_1.default.unsafe(schemaSql);
        console.log('Database reset successfully. Tables created.');
    }
    catch (err) {
        console.error('Error resetting database:', err);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
}
reset();
