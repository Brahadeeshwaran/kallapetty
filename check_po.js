const postgres = require('postgres');
const sql = postgres('postgresql://postgres:1714@localhost:5432/kallapetty_db');

async function check() {
  try {
    const res = await sql`SELECT * FROM purchase_orders WHERE id = '517265f6-3fd5-4ef0-a4be-2290857a4e64'`;
    console.log(res);
  } catch (e) { console.error(e); }
  process.exit(0);
}
check();
