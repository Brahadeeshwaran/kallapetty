import sql from '../models/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

export async function assertShopAccess(user: AuthRequest['user'], shopId: string) {
  const shops = await sql<any[]>`SELECT * FROM shops WHERE id = ${shopId}`;
  const shop = shops[0];
  if (!shop) throw new HttpError(404, 'Shop not found');
  if (user?.is_superadmin) return shop;
  if (shop.business_id !== user?.business_id) throw new HttpError(403, 'Forbidden');
  if (!user!.is_business_owner) {
    const assignments = await sql<any[]>`SELECT * FROM user_shops WHERE user_id = ${user!.id} AND shop_id = ${shopId}`;
    const assignment = assignments[0];
    if (!assignment) throw new HttpError(403, 'You do not have access to this shop');
  }
  return shop;
}

export async function assertShopPermission(user: AuthRequest['user'], shopId: string, permission: string) {
  if (user?.is_superadmin || user?.is_business_owner) return;
  const perms = user?.shop_permissions?.[shopId] || [];
  if (!perms.includes(permission)) {
    throw new HttpError(403, `Missing required shop permission: ${permission}`);
  }
}

export async function assertCustomerAccess(user: AuthRequest['user'], customerId: string) {
  const customers = await sql<any[]>`SELECT * FROM customers WHERE id = ${customerId}`;
  const customer = customers[0];
  if (!customer) throw new HttpError(404, 'Customer not found');
  if (!user?.is_superadmin && customer.business_id !== user?.business_id) throw new HttpError(403, 'Forbidden');
  return customer;
}

export async function assertOrderAccess(user: AuthRequest['user'], orderId: string) {
  const orders = await sql<any[]>`SELECT * FROM orders WHERE id = ${orderId}`;
  const order = orders[0];
  if (!order) throw new HttpError(404, 'Order not found');
  await assertShopAccess(user, order.shop_id);
  return order;
}
