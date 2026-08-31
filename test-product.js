const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config({ path: 'B:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\.env' });
const sql = postgres(process.env.DATABASE_URL);

async function test() {
  const p = await sql`SELECT * FROM products WHERE id = 'af93dfdd-3a80-424e-a128-2656a4e44878'`;
  console.log('Product exists:', p.length > 0);
  process.exit(0);
}
test();
