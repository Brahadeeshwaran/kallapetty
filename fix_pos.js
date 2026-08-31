const postgres = require('postgres');
const sql = postgres('postgresql://postgres:1714@localhost:5432/kallapetty_db');

async function fix() {
  try {
    // For any partial or completed POs, recalculate their total amount correctly based on qty_ordered - qty_rejected
    await sql`
      UPDATE purchase_orders po
      SET total_amount = (
        SELECT COALESCE(SUM((qty_ordered - qty_rejected) * unit_price), 0)
        FROM purchase_order_items
        WHERE order_id = po.id
      )
    `;

    // Also, if any PO has (qty_received + qty_rejected) >= qty_ordered, mark it as completed
    await sql`
      UPDATE purchase_orders po
      SET status = 'completed'
      WHERE status = 'partial' 
      AND (
        SELECT COALESCE(SUM(qty_received + qty_rejected), 0) >= COALESCE(SUM(qty_ordered), 0)
        FROM purchase_order_items
        WHERE order_id = po.id
      )
    `;
    
    console.log("Stuck POs fixed!");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
fix();
