import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Payment, Expense } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createPaymentSchema, createExpenseSchema } from '../validators/app.validator';
import { assertCustomerAccess, assertShopAccess, HttpError } from '../utils/access';

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    await assertShopAccess(req.user, data.shop_id);
    await assertCustomerAccess(req.user, data.customer_id);
    const created_by = req.user?.id || null;

    const result = await sql.begin(async (tx) => {
      const initialAmount = Number(data.amount);
      let remainingAmount = initialAmount;
      let allocatedToOrders = 0;

      if (data.customer_id && remainingAmount > 0) {
        // Fetch unpaid or partial orders for this customer in this shop (oldest first)
        const pendingOrders = await tx<any[]>`
          SELECT * FROM orders
          WHERE customer_id = ${data.customer_id}
          AND shop_id = ${data.shop_id}
          AND status IN ('unpaid', 'partial')
          ORDER BY created_at ASC
          FOR UPDATE
        `;

        for (const order of pendingOrders) {
          const total = Number(order.total_amount) - Number(order.discount_amount || 0);
          const paid = Number(order.amount_paid || 0);
          const balance = total - paid;

          if (balance <= 0) continue;

          const payForOrder = Math.min(remainingAmount, balance);
          const newAmountPaid = paid + payForOrder;
          const newStatus = newAmountPaid >= total - 0.01 ? 'paid' : 'partial';

          await tx`
            UPDATE orders
            SET amount_paid = ${newAmountPaid}, status = ${newStatus}
            WHERE id = ${order.id}
          `;

          remainingAmount -= payForOrder;
          allocatedToOrders += payForOrder;
          if (remainingAmount <= 0.001) break;
        }
      }

      let primaryPaymentRecord: Payment | null = null;

      // 1. Record order payment portion (if any)
      if (allocatedToOrders > 0) {
        const orderPayments = await tx<Payment[]>`
          INSERT INTO payments ${tx({
            shop_id: data.shop_id,
            customer_id: data.customer_id,
            amount: allocatedToOrders,
            received_via: data.received_via,
            is_order_payment: true,
            created_by
          })}
          RETURNING *
        `;
        primaryPaymentRecord = orderPayments[0];
      }

      // 2. Record excess / advance payment portion (if any)
      if (remainingAmount > 0.001 || allocatedToOrders === 0) {
        const excessPayments = await tx<Payment[]>`
          INSERT INTO payments ${tx({
            shop_id: data.shop_id,
            customer_id: data.customer_id,
            amount: allocatedToOrders === 0 ? initialAmount : remainingAmount,
            received_via: data.received_via,
            is_order_payment: false,
            created_by
          })}
          RETURNING *
        `;
        if (!primaryPaymentRecord) {
          primaryPaymentRecord = excessPayments[0];
        }
      }

      return primaryPaymentRecord!;
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    await assertShopAccess(req.user, data.shop_id);
    const created_by = req.user?.id || null;
    const expenses = await sql<Expense[]>`
      INSERT INTO expenses ${sql({ ...data, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: expenses[0] });
  } catch (error) { next(error); }
};

export const getPaymentsAndExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop_id = req.query.shop_id as string;
    if (!shop_id) throw new HttpError(400, 'shop_id is required');
    await assertShopAccess(req.user, shop_id);
    
    const payments = await sql<any[]>`
      SELECT p.*, 
             c.id as c_id, c.name as c_name, c.phone as c_phone 
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.shop_id = ${shop_id}
      AND DATE(p.created_at AT TIME ZONE 'Asia/Kolkata') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
      ORDER BY p.created_at DESC
    `;
    const formattedPayments = payments.map(p => {
      const { c_id, c_name, c_phone, ...payment } = p;
      return {
        ...payment,
        customer: c_id ? { id: c_id, name: c_name, phone: c_phone } : null
      };
    });
    
    const expenses = await sql<Expense[]>`
      SELECT * FROM expenses
      WHERE shop_id = ${shop_id}
      AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
      ORDER BY created_at DESC
    `;
    
    res.json({ status: 'success', data: { payments: formattedPayments, expenses } });
  } catch (error) { next(error); }
};
