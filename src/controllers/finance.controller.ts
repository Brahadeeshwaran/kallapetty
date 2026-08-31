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
    const payments = await sql<Payment[]>`
      INSERT INTO payments ${sql({ ...data, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: payments[0] });
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
