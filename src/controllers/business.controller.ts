import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Business } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createBusinessSchema } from '../validators/app.validator';

export const createBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createBusinessSchema.parse(req.body);
    const created_by = req.user?.id || null;
    const businesses = await sql<Business[]>`
      INSERT INTO businesses ${sql({ ...data, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: businesses[0] });
  } catch (error) { next(error); }
};

export const getBusinesses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businesses = await sql<any[]>`
      SELECT 
        b.*, 
        (SELECT COUNT(*) FROM shops WHERE business_id = b.id) as _count_shops,
        (SELECT COUNT(*) FROM users WHERE business_id = b.id) as _count_users
      FROM businesses b
    `;
    const formatted = businesses.map(b => ({
      ...b,
      _count: { shops: Number(b._count_shops), users: Number(b._count_users) }
    }));
    res.json({ status: 'success', data: formatted });
  } catch (error) { next(error); }
};

export const getSystemStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.is_superadmin) return res.status(403).json({ status: 'error', message: 'Forbidden' });

    const [{ count: totalBusinesses }] = await sql`SELECT COUNT(*) FROM businesses WHERE name != 'KallaPetty Master'`;
    const [{ count: activeBusinesses }] = await sql`SELECT COUNT(*) FROM businesses WHERE is_active = true AND name != 'KallaPetty Master'`;
    
    // total shops whose business is not KallaPetty Master
    const [{ count: totalShops }] = await sql`
      SELECT COUNT(*) FROM shops s 
      JOIN businesses b ON s.business_id = b.id 
      WHERE b.name != 'KallaPetty Master'
    `;
    const [{ count: totalUsers }] = await sql`
      SELECT COUNT(*) FROM users u 
      JOIN businesses b ON u.business_id = b.id 
      WHERE b.name != 'KallaPetty Master'
    `;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const [{ count: expiringSoon }] = await sql`
      SELECT COUNT(*) FROM shops s
      JOIN businesses b ON s.business_id = b.id
      WHERE s.subscription_end_date <= ${nextWeek} 
      AND s.subscription_end_date IS NOT NULL
      AND s.is_active = true
      AND b.name != 'KallaPetty Master'
    `;

    res.json({ 
      status: 'success', 
      data: {
        totalBusinesses: Number(totalBusinesses),
        activeBusinesses: Number(activeBusinesses),
        totalShops: Number(totalShops),
        totalUsers: Number(totalUsers),
        expiringSoon: Number(expiringSoon)
      } 
    });
  } catch (error) { next(error); }
};

export const updateBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = require('../validators/app.validator').updateBusinessSchema.parse(req.body);
    
    if (!req.user?.is_superadmin) return res.status(403).json({ status: 'error', message: 'Forbidden' });

    const businesses = await sql<Business[]>`
      UPDATE businesses SET ${sql(data as any)} WHERE id = ${id} RETURNING *
    `;
    res.json({ status: 'success', data: businesses[0] });
  } catch (error) { next(error); }
};

export const updateMyBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = require('../validators/app.validator').updateBusinessSchema.parse(req.body);
    
    // Allow owner/admin to update their own business profile
    if (!req.user?.is_business_owner && !req.user?.is_superadmin) {
      return res.status(403).json({ status: 'error', message: 'Business Owner permission required' });
    }

    const businesses = await sql<Business[]>`
      UPDATE businesses SET ${sql(data as any)} WHERE id = ${req.user.business_id!} RETURNING *
    `;
    res.json({ status: 'success', data: businesses[0] });
  } catch (error) { next(error); }
};

export const getMyBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businesses = await sql<Business[]>`SELECT * FROM businesses WHERE id = ${req.user?.business_id!}`;
    res.json({ status: 'success', data: businesses[0] });
  } catch (error) { next(error); }
};
