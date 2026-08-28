import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Customer } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createCustomerSchema } from '../validators/app.validator';

export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const created_by = req.user?.id || null;
    const business_id = req.user!.business_id;
    const customers = await sql<Customer[]>`
      INSERT INTO customers ${sql({ ...data, business_id, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: customers[0] });
  } catch (error) { next(error); }
};

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await sql<any[]>`
      SELECT 
        c.id, c.name, c.phone, c.created_at,
        COALESCE(
          (SELECT SUM(total_amount - discount_amount - amount_paid) FROM orders WHERE customer_id = c.id), 0
        ) as order_due,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE customer_id = c.id AND is_order_payment = false), 0
        ) as extra_payments
      FROM customers c
      WHERE c.business_id = ${req.user!.business_id}
    `;

    const data = customers.map(c => {
      const dueAmount = parseFloat(c.order_due) - parseFloat(c.extra_payments);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        created_at: c.created_at,
        due_amount: dueAmount > 0 ? dueAmount : 0
      };
    });

    res.json({ status: 'success', data });
  } catch (error) { next(error); }
};
