import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Shop } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createShopSchema } from '../validators/app.validator';

export const createShop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createShopSchema.parse(req.body);
    
    let targetBusinessId = req.user!.business_id;
    if (req.user?.is_superadmin && (data as any).business_id) {
       targetBusinessId = (data as any).business_id;
    }

    const created_by = req.user?.id || null;
    const allow_service = data.allow_service_products || false;
    const shops = await sql<Shop[]>`
      INSERT INTO shops (name, business_id, allow_service_products, created_by)
      VALUES (${data.name}, ${targetBusinessId}, ${allow_service}, ${created_by})
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: shops[0] });
  } catch (error) { next(error); }
};

export const getShops = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let shops;
    const businessIdQuery = req.query.business_id as string | undefined;

    if (req.user?.is_superadmin) {
      if (businessIdQuery) {
        shops = await sql<Shop[]>`SELECT * FROM shops WHERE business_id = ${businessIdQuery}`;
      } else {
        shops = await sql<Shop[]>`SELECT * FROM shops`;
      }
    } else if (req.user?.is_business_owner) {
      shops = await sql<Shop[]>`SELECT * FROM shops WHERE business_id = ${req.user.business_id}`;
    } else {
      shops = await sql<Shop[]>`
        SELECT s.* FROM shops s
        JOIN user_shops us ON s.id = us.shop_id
        WHERE us.user_id = ${req.user!.id}
      `;
    }
    res.json({ status: 'success', data: shops });
  } catch (error) { next(error); }
};

export const updateShop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = require('../validators/app.validator').updateShopSchema.parse(req.body);
    
    // Ensure ownership if not superadmin
    if (!req.user?.is_superadmin) {
      const existings = await sql<Shop[]>`SELECT * FROM shops WHERE id = ${id}`;
      const existing = existings[0];
      if (existing?.business_id !== req.user?.business_id) return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const shops = await sql<Shop[]>`
      UPDATE shops SET ${sql(data as any)}
      WHERE id = ${id} RETURNING *
    `;
    res.json({ status: 'success', data: shops[0] });
  } catch (error) { next(error); }
};

export const markShopPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.is_superadmin) return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const { id } = req.params;

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30); // 30 days logic

    const shops = await sql<Shop[]>`
      UPDATE shops SET 
        last_paid_date = NOW(),
        subscription_end_date = ${nextMonth},
        is_active = true
      WHERE id = ${id} RETURNING *
    `;

    res.json({ status: 'success', data: shops[0] });
  } catch (error) { next(error); }
};

export const resetShopData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { confirmation, reset_stock_to_zero, reset_opening_balances } = require('../validators/app.validator').resetShopDataSchema.parse(req.body);

    if (confirmation !== 'RESET') {
      return res.status(400).json({ status: 'error', message: 'Confirmation code must be RESET' });
    }

    // Verify ownership or superadmin
    const existings = await sql<Shop[]>`SELECT * FROM shops WHERE id = ${id}`;
    const shop = existings[0];
    if (!shop) return res.status(404).json({ status: 'error', message: 'Shop not found' });

    if (!req.user?.is_superadmin && !req.user?.is_business_owner && shop.business_id !== req.user?.business_id) {
      return res.status(403).json({ status: 'error', message: 'Only business owners can reset shop data' });
    }

    await sql.begin(async (tx) => {
      // 1. Delete Order Items and Orders
      await tx`
        DELETE FROM order_items 
        WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ${id})
      `;
      await tx`DELETE FROM orders WHERE shop_id = ${id}`;

      // 2. Delete Payments & Expenses & Stock Logs
      await tx`DELETE FROM payments WHERE shop_id = ${id}`;
      await tx`DELETE FROM expenses WHERE shop_id = ${id}`;
      await tx`DELETE FROM product_stock_logs WHERE shop_id = ${id}`;

      // 3. Delete Purchase Invoices, Purchase Orders, Supplier Payments, Purchase Returns
      await tx`
        DELETE FROM purchase_invoice_items 
        WHERE invoice_id IN (SELECT id FROM purchase_invoices WHERE shop_id = ${id})
      `;
      await tx`DELETE FROM purchase_invoices WHERE shop_id = ${id}`;

      await tx`
        DELETE FROM purchase_order_items 
        WHERE order_id IN (SELECT id FROM purchase_orders WHERE shop_id = ${id})
      `;
      await tx`DELETE FROM purchase_orders WHERE shop_id = ${id}`;

      await tx`DELETE FROM supplier_payments WHERE shop_id = ${id}`;

      await tx`
        DELETE FROM purchase_return_items 
        WHERE return_id IN (SELECT id FROM purchase_returns WHERE shop_id = ${id})
      `;
      await tx`DELETE FROM purchase_returns WHERE shop_id = ${id}`;

      // 4. Reset next_invoice_number to 1
      await tx`UPDATE shops SET next_invoice_number = 1 WHERE id = ${id}`;

      // 5. Optional Stock / Opening balance reset
      if (reset_stock_to_zero) {
        await tx`UPDATE products SET stock = 0 WHERE shop_id = ${id}`;
      }

      if (reset_opening_balances) {
        await tx`UPDATE customers SET opening_balance = 0 WHERE business_id = ${shop.business_id}`;
        await tx`UPDATE suppliers SET opening_balance = 0, outstanding_balance = 0 WHERE business_id = ${shop.business_id}`;
      }
    });

    res.json({ status: 'success', message: 'Transactional data for shop reset successfully!' });
  } catch (error) {
    next(error);
  }
};
