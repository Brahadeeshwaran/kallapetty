const postgres = require('postgres');
const sql = postgres('postgresql://postgres:1714@localhost:5432/kallapetty_db');

async function check() {
  const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items'`;
  console.log(res);
  process.exit(0);
}
check();
