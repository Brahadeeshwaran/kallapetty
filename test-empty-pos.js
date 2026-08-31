const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });
const sql = postgres(process.env.DATABASE_URL);

async function test() {
  const orders = await sql`
      SELECT po.id, po.supplier_id,
             (
                SELECT json_agg(json_build_object(
                  'id', poi.id
                ))
                FROM purchase_order_items poi 
                JOIN products p ON p.id = poi.product_id
                WHERE poi.order_id = po.id
             ) as items
      FROM purchase_orders po
  `;
  console.log('Orders with null items:', orders.filter(o => !o.items).length);
  console.log('Total orders:', orders.length);
  const empty = orders.find(o => !o.items);
  if (empty) console.log('Empty PO id:', empty.id);
  process.exit(0);
}
test();
