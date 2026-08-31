const postgres = require('postgres');
const sql = postgres('postgresql://postgres:1714@localhost:5432/kallapetty_db');

async function migrate() {
  try {
    await sql`ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS qty_rejected DECIMAL(10, 2) NOT NULL DEFAULT 0;`;
    console.log("Column added successfully!");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
migrate();
