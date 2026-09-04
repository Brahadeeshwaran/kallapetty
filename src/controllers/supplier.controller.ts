import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Supplier } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createSupplierSchema, updateSupplierSchema, createSupplierPaymentSchema } from '../validators/app.validator';

export const createSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSupplierSchema.parse(req.body);
    const created_by = req.user?.id || null;
    const suppliers = await sql<Supplier[]>`
      INSERT INTO suppliers ${sql({
        ...data,
        business_id: req.user!.business_id,
        created_by,
      })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: suppliers[0] });
  } catch (error) { next(error); }
};

export const getSuppliers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const suppliers = await sql<Supplier[]>`
      SELECT * FROM suppliers
      WHERE business_id = ${req.user!.business_id}
      ORDER BY created_at DESC
    `;
    res.json({ status: 'success', data: suppliers });
  } catch (error) { next(error); }
};

export const updateSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateSupplierSchema.parse(req.body);
    
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No data provided to update' });
    }

    const supplier = await sql<Supplier[]>`
      UPDATE suppliers SET ${sql(data as any, Object.keys(data))}
      WHERE id = ${id} AND business_id = ${req.user!.business_id}
      RETURNING *
    `;
    
    if (!supplier.length) {
      return res.status(404).json({ status: 'error', message: 'Supplier not found' });
    }
    
    res.json({ status: 'success', data: supplier[0] });
  } catch (error) { next(error); }
};

export const addSupplierPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { shop_id } = req.query;
    if (!shop_id) return res.status(400).json({ status: 'error', message: 'shop_id is required' });
    
    const data = createSupplierPaymentSchema.parse({
      ...req.body,
      shop_id: shop_id as string,
      supplier_id: id
    });
    const created_by = req.user?.id || null;

    const payment = await sql.begin(async tx => {
      const pmt = await tx`
        INSERT INTO supplier_payments ${tx({
          shop_id: shop_id as string,
          supplier_id: id,
          amount_paid: data.amount_paid,
          payment_mode: data.payment_mode,
          reference_number: data.reference_number || null,
          created_by,
        })}
        RETURNING *
      `;
      
      await tx`
        UPDATE suppliers SET outstanding_balance = outstanding_balance - ${data.amount_paid}
        WHERE id = ${id} AND business_id = ${req.user!.business_id}
      `;
      
      return pmt[0];
    });

    res.status(201).json({ status: 'success', data: payment });
  } catch (error) { next(error); }
};

export const getSupplierPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prices = await sql<any[]>`
      SELECT product_id, last_purchase_price 
      FROM supplier_product_prices 
      WHERE supplier_id = ${id}
    `;
    const priceMap: Record<string, number> = {};
    prices.forEach(p => {
      priceMap[p.product_id] = parseFloat(p.last_purchase_price);
    });
    res.json({ status: 'success', data: priceMap });
  } catch (error) { next(error); }
};
