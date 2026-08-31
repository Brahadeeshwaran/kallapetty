const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });

const sql = postgres(process.env.DATABASE_URL);

async function test() {
  const orders = await sql`
      SELECT po.id,
             (
                SELECT json_agg(json_build_object(
                  'id', poi.id,
                  'product_id', poi.product_id,
                  'product', json_build_object('name', p.name, 'stock', p.stock)
                ))
                FROM purchase_order_items poi 
                JOIN products p ON p.id = poi.product_id
                WHERE poi.order_id = po.id
             ) as items
      FROM purchase_orders po
      ORDER BY po.created_at DESC LIMIT 1
  `;
  console.log('PO Items in subquery:', orders[0].items);
  process.exit(0);
}
test();
