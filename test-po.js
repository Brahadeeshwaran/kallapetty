const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });

const sql = postgres(process.env.DATABASE_URL);

async function test() {
  const orders = await sql`SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 1`;
  console.log('Latest PO:', orders[0]);
  
  if (orders.length > 0) {
    const items = await sql`SELECT * FROM purchase_order_items WHERE order_id = ${orders[0].id}`;
    console.log('PO Items:', items);
  }
  process.exit(0);
}
test();
