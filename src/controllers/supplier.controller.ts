import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Supplier } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createSupplierSchema } from '../validators/app.validator';

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
