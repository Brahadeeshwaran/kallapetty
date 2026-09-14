import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Customer } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createCustomerSchema, updateCustomerSchema } from '../validators/app.validator';

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

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);
    
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No data provided to update' });
    }

    const customer = await sql<Customer[]>`
      UPDATE customers SET ${sql(data as any, Object.keys(data))}
      WHERE id = ${id} AND business_id = ${req.user!.business_id}
      RETURNING *
    `;
    
    if (!customer.length) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    
    res.json({ status: 'success', data: customer[0] });
  } catch (error) { next(error); }
};

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await sql<any[]>`
      SELECT 
        c.id, c.name, c.phone, c.address, c.gst_number, c.opening_balance, c.opening_balance_type, c.created_at,
        COALESCE(
          (SELECT SUM(total_amount - discount_amount - amount_paid) FROM orders WHERE customer_id = c.id), 0
        ) as order_due,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE customer_id = c.id AND is_order_payment = false), 0
        ) as extra_payments
      FROM customers c
      WHERE c.business_id = ${req.user!.business_id}
      ORDER BY c.created_at DESC
    `;

    const data = customers.map(c => {
      const openingBal = parseFloat(c.opening_balance || '0');
      const initialDue = (c.opening_balance_type === 'to_pay' ? -openingBal : openingBal) || 0;
      const dueAmount = initialDue + parseFloat(c.order_due || '0') - parseFloat(c.extra_payments || '0');
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        gst_number: c.gst_number,
        opening_balance: openingBal,
        opening_balance_type: c.opening_balance_type || 'to_receive',
        created_at: c.created_at,
        due_amount: dueAmount
      };
    });

    res.json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getCustomerPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prices = await sql<any[]>`
      SELECT product_id, custom_price 
      FROM customer_product_prices 
      WHERE customer_id = ${id}
    `;
    const priceMap: Record<string, number> = {};
    prices.forEach(p => {
      priceMap[p.product_id] = parseFloat(p.custom_price);
    });
    res.json({ status: 'success', data: priceMap });
  } catch (error) { next(error); }
};
