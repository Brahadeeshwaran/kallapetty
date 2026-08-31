const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) DEFAULT 0;`;
    console.log('Migration successful: amount_paid added to purchase_orders');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}
run();
