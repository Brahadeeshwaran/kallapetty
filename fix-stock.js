const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });
const sql = postgres(process.env.DATABASE_URL);

async function fix() {
  try {
    // Get the latest PO
    const pos = await sql`SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 1`;
    if (pos.length === 0) { console.log("No PO found"); return process.exit(0); }
    const po = pos[0];
    console.log("Fixing PO:", po.id);

    // Update PO status
    await sql`UPDATE purchase_orders SET status = 'completed' WHERE id = ${po.id}`;

    // Get PO items
    const poItems = await sql`SELECT * FROM purchase_order_items WHERE order_id = ${po.id}`;
    for (const item of poItems) {
      // Update PO item qty_received to match qty_ordered
      await sql`UPDATE purchase_order_items SET qty_received = ${item.qty_ordered} WHERE id = ${item.id}`;
      
      // Update Product Stock
      const products = await sql`SELECT * FROM products WHERE id = ${item.product_id}`;
      if (products.length > 0) {
        const product = products[0];
        console.log(`Product ${product.name} stock is currently ${product.stock}`);
        // Set stock explicitly to 15
        await sql`UPDATE products SET stock = 15 WHERE id = ${item.product_id}`;
        console.log(`Set stock to 15 for ${product.name}`);
      }
    }
    console.log("Fixed successfully!");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fix();
