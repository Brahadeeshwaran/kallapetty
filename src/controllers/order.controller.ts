import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Order } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createOrderSchema } from '../validators/app.validator';
import { assertCustomerAccess, assertOrderAccess, assertShopAccess, assertShopPermission, HttpError } from '../utils/access';

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);
    await assertShopAccess(req.user, data.shop_id);
    await assertShopPermission(req.user, data.shop_id, 'pos:access');
    if (data.customer_id) await assertCustomerAccess(req.user, data.customer_id);

    const productIds = data.items.map(item => item.product_id);
    if (productIds.length === 0) throw new HttpError(400, 'Order must contain at least one item');
    
    const products = await sql<any[]>`
      SELECT * FROM products 
      WHERE id IN ${sql(productIds)} 
      AND shop_id = ${data.shop_id}
    `;
    if (products.length !== new Set(productIds).size) {
      throw new HttpError(400, 'One or more products do not belong to the selected shop');
    }

    const productById = new Map(products.map(product => [product.id, product]));
    const calculatedItems = data.items.map(item => {
      const product = productById.get(item.product_id)!;
      const price = Number(product.price);
      const taxAmount = price * item.qty * (Number(product.tax_rate) / 100);
      return { ...item, price, tax_amount: taxAmount, product };
    });
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.price * item.qty + item.tax_amount, 0);
    const taxAmount = calculatedItems.reduce((sum, item) => sum + item.tax_amount, 0);
    if (data.discount_amount > totalAmount) throw new HttpError(400, 'Discount cannot exceed bill total');
    const totalToPay = totalAmount - data.discount_amount;
    if (data.amount_paid > totalToPay) throw new HttpError(400, 'Amount paid cannot exceed bill total');
    if (data.amount_paid < totalToPay && !data.customer_id) {
      return res.status(400).json({ status: 'error', message: 'Partial payment requires a registered customer.' });
    }
    const status = data.amount_paid === 0 ? 'unpaid' : data.amount_paid === totalToPay ? 'paid' : 'partial';

    const created_by = req.user?.id || null;

    const newOrder = await sql.begin(async (tx) => {
      const orders = await tx<Order[]>`
        INSERT INTO orders ${tx({
          shop_id: data.shop_id,
          customer_id: data.customer_id || null,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          discount_amount: data.discount_amount,
          amount_paid: data.amount_paid,
          status,
          order_type: data.order_type,
          expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
          delivery_address: data.delivery_address || null,
          delivery_status: data.order_type === 'delivery' ? 'pending' : null,
          delivery_notes: data.delivery_notes || null,
          created_by,
        })}
        RETURNING *
      `;
      const order = orders[0];

      for (const item of calculatedItems) {
        await tx`
          INSERT INTO order_items ${tx({
            order_id: order.id,
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
            tax_amount: item.tax_amount,
            created_by,
          })}
        `;

        if (!item.product.is_service) {
          const result = await tx`
            UPDATE products SET stock = stock - ${item.qty}
            WHERE id = ${item.product_id} AND stock >= ${item.qty}
          `;
          if (result.count !== 1) throw new HttpError(400, `Insufficient stock for ${item.product.name}`);
        }
      }

      if (data.amount_paid > 0) {
        await tx`
          INSERT INTO payments ${tx({
            shop_id: data.shop_id,
            customer_id: data.customer_id || null,
            amount: data.amount_paid,
            received_via: data.received_via,
            is_order_payment: true,
            created_by,
          })}
        `;
      }

      return order;
    });

    res.status(201).json({ status: 'success', data: newOrder });
  } catch (error) { next(error); }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop_id = req.query.shop_id as string;
    let queryConditions = [];
    if (shop_id) queryConditions.push(sql`o.shop_id = ${shop_id}`);

    // SaaS Multi-tenancy: Lock data to the user's business unless superadmin
    if (!req.user?.is_superadmin) {
      if (!req.user?.is_business_owner) {
        const allowedShopIds = Object.keys(req.user?.shop_permissions || {}).filter(
          id => req.user!.shop_permissions[id].includes('invoices:list') || req.user!.shop_permissions[id].includes('pos:access')
        );
        if (shop_id && !allowedShopIds.includes(shop_id)) return res.status(403).json({ status: 'error', message: 'Forbidden' });
        if (!shop_id) {
            if (allowedShopIds.length === 0) return res.status(403).json({ status: 'error', message: 'Forbidden' });
            queryConditions.push(sql`o.shop_id IN ${sql(allowedShopIds)}`);
        }
      } else {
        queryConditions.push(sql`s.business_id = ${req.user?.business_id!}`);
      }
    }

    const whereClause = queryConditions.length > 0 
      ? sql`WHERE ${queryConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` 
      : sql``;

    const orders = await sql<any[]>`
      SELECT o.*, 
             c.id as c_id, c.name as c_name, c.phone as c_phone,
             (
                SELECT json_agg(json_build_object(
                  'id', oi.id,
                  'order_id', oi.order_id,
                  'product_id', oi.product_id,
                  'qty', oi.qty,
                  'price', oi.price,
                  'tax_amount', oi.tax_amount,
                  'product', (SELECT row_to_json(p.*) FROM products p WHERE p.id = oi.product_id)
                ))
                FROM order_items oi WHERE oi.order_id = o.id
             ) as order_items
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      JOIN shops s ON o.shop_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const formatted = orders.map(o => {
      const { c_id, c_name, c_phone, ...order } = o;
      return {
        ...order,
        customer: c_id ? { id: c_id, name: c_name, phone: c_phone } : null,
        order_items: o.order_items || []
      };
    });
    res.json({ status: 'success', data: formatted });
  } catch (error) { next(error); }
};

export const markOrderPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, received_via } = req.body;
    
    const order = await assertOrderAccess(req.user, id);
    await assertShopPermission(req.user, order.shop_id, 'invoices:list'); // or pos:access

    const additionalAmount = parseFloat(amount || 0);
    if (!Number.isFinite(additionalAmount) || additionalAmount <= 0) throw new HttpError(400, 'A positive payment amount is required');
    const newAmountPaid = parseFloat(order.amount_paid as any) + additionalAmount;
    const total = parseFloat(order.total_amount as any) - parseFloat((order.discount_amount as any) || 0);
    if (newAmountPaid > total) throw new HttpError(400, 'Payment exceeds outstanding balance');
    
    const newStatus = newAmountPaid >= total ? 'paid' : 'partial';

    const updatedOrder = await sql.begin(async (tx) => {
      const orders = await tx<Order[]>`
        UPDATE orders SET amount_paid = ${newAmountPaid}, status = ${newStatus}
        WHERE id = ${id} RETURNING *
      `;
      const updated = orders[0];

      if (additionalAmount > 0) {
        await tx`
          INSERT INTO payments ${tx({
            shop_id: order.shop_id,
            customer_id: order.customer_id || null,
            amount: additionalAmount,
            received_via: received_via || 'Cash',
            is_order_payment: true,
            created_by: req.user?.id || null,
          })}
        `;
      }
      
      return updated;
    });

    res.json({ status: 'success', data: updatedOrder });
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { delivery_status, delivery_notes } = require('../validators/app.validator').updateDeliveryStatusSchema.parse(req.body);
    
    const order = await assertOrderAccess(req.user, id);
    await assertShopPermission(req.user, order.shop_id, 'deliveries:edit');

    let delivered_at = order.delivered_at;
    if (delivery_status === 'delivered' && order.delivery_status !== 'delivered') {
      delivered_at = new Date();
    }

    const orders = await sql<Order[]>`
      UPDATE orders SET
        delivery_status = ${delivery_status},
        delivery_notes = ${delivery_notes !== undefined ? delivery_notes : order.delivery_notes},
        delivered_at = ${delivered_at}
      WHERE id = ${id} RETURNING *
    `;

    res.json({ status: 'success', data: orders[0] });
  } catch (error) {
    next(error);
  }
};
