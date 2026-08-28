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
    const shops = await sql<Shop[]>`
      INSERT INTO shops (name, business_id, created_by)
      VALUES (${data.name}, ${targetBusinessId}, ${created_by})
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
