import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Product } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createProductSchema } from '../validators/app.validator';
import { assertShopAccess, assertShopPermission, HttpError } from '../utils/access';

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    await assertShopAccess(req.user, data.shop_id);
    await assertShopPermission(req.user, data.shop_id, 'inventory:add');
    const created_by = req.user?.id || null;
    const products = await sql<Product[]>`
      INSERT INTO products ${sql({ ...data, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: products[0] });
  } catch (error) { next(error); }
};

export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop_id = req.query.shop_id as string;
    const barcode = req.query.barcode as string;
    
    let queryConditions = [];
    if (shop_id) queryConditions.push(sql`p.shop_id = ${shop_id}`);
    if (barcode) queryConditions.push(sql`p.barcode = ${barcode}`);

    // SaaS Multi-tenancy: Lock data to the user's business unless superadmin
    if (!req.user?.is_superadmin) {
      if (!req.user?.is_business_owner) {
        // Find which shops the user has 'inventory:list' or 'pos:access' permission for
        const allowedShopIds = Object.keys(req.user?.shop_permissions || {}).filter(
          id => req.user!.shop_permissions[id].includes('inventory:list') || req.user!.shop_permissions[id].includes('pos:access')
        );
        
        if (shop_id && !allowedShopIds.includes(shop_id)) return res.status(403).json({ status: 'error', message: 'Forbidden' });
        
        if (!shop_id) {
            if (allowedShopIds.length === 0) return res.status(403).json({ status: 'error', message: 'Forbidden' });
            queryConditions.push(sql`p.shop_id IN ${sql(allowedShopIds)}`);
        }
      } else {
        queryConditions.push(sql`s.business_id = ${req.user?.business_id!}`);
      }
    }

    const whereClause = queryConditions.length > 0 
      ? sql`WHERE ${queryConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` 
      : sql``;

    const products = await sql<Product[]>`
      SELECT p.* FROM products p
      JOIN shops s ON p.shop_id = s.id
      ${whereClause}
    `;
    res.json({ status: 'success', data: products });
  } catch (error) { next(error); }
};

export const getProductByBarcode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;
    const shop_id = req.query.shop_id as string;
    if (!shop_id) throw new HttpError(400, 'shop_id is required');
    await assertShopAccess(req.user, shop_id);
    const products = await sql<Product[]>`
      SELECT * FROM products
      WHERE barcode = ${barcode} AND shop_id = ${shop_id}
      LIMIT 1
    `;
    const product = products[0];
    
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found with this barcode' });
    }
    
    res.json({ status: 'success', data: product });
  } catch (error) { next(error); }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = require('../validators/app.validator').updateProductSchema.parse(req.body);
    
    // Enforce permissions
    const existings = await sql<Product[]>`SELECT * FROM products WHERE id = ${id}`;
    const existing = existings[0];
    if (!existing) return res.status(404).json({ status: 'error', message: 'Product not found' });
    await assertShopAccess(req.user, existing.shop_id);
    await assertShopPermission(req.user, existing.shop_id, 'inventory:edit');

    const products = await sql<Product[]>`
      UPDATE products SET ${sql(data as any)}
      WHERE id = ${id} RETURNING *
    `;
    res.json({ status: 'success', data: products[0] });
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const existings = await sql<Product[]>`SELECT * FROM products WHERE id = ${id}`;
    const existing = existings[0];
    if (!existing) return res.status(404).json({ status: 'error', message: 'Product not found' });
    await assertShopAccess(req.user, existing.shop_id);
    await assertShopPermission(req.user, existing.shop_id, 'inventory:delete');

    await sql`DELETE FROM products WHERE id = ${id}`;
    res.json({ status: 'success', message: 'Product deleted' });
  } catch (error) { next(error); }
};
