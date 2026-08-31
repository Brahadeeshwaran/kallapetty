const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS product_stock_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        change_type VARCHAR(50) NOT NULL,
        qty_change INT NOT NULL,
        old_stock INT NOT NULL,
        new_stock INT NOT NULL,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );
    `;
    console.log("Migration successful");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    process.exit(0);
  }
}

run();
