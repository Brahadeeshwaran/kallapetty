import { Response, NextFunction } from 'express';
import { z } from 'zod';
import sql from '../models/db';
import { Role } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';

const createRoleSchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(2),
  permissions: z.array(z.string())
});

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  permissions: z.array(z.string()).optional()
});

export const getRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { shop_id } = req.query;
    if (!shop_id) return res.json({ status: 'success', data: [] });

    if (!req.user?.is_superadmin) {
       const shops = await sql<any[]>`SELECT * FROM shops WHERE id = ${String(shop_id)}`;
       const shop = shops[0];
       if (!shop || shop.business_id !== req.user?.business_id) {
           return res.status(403).json({ status: 'error', message: 'Forbidden' });
       }
    }

    const roles = await sql<any[]>`
      SELECT r.*,
             (SELECT COUNT(*) FROM user_shops WHERE role_id = r.id) as _count_user_shops
      FROM roles r
      WHERE r.shop_id = ${String(shop_id)}
    `;
    const formatted = roles.map(r => ({
      ...r,
      _count: { user_shops: Number(r._count_user_shops) }
    }));
    res.json({ status: 'success', data: formatted });
  } catch (error) { next(error); }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createRoleSchema.parse(req.body);
    
    // Check if role name already exists in this shop
    const existings = await sql<any[]>`
      SELECT * FROM roles 
      WHERE shop_id = ${data.shop_id} AND LOWER(name) = LOWER(${data.name})
      LIMIT 1
    `;
    const existing = existings[0];
    
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'A role with this name already exists in this shop' });
    }

    const created_by = req.user?.id || null;
    const roles = await sql<Role[]>`
      INSERT INTO roles ${sql({ ...data, created_by })}
      RETURNING *
    `;
    
    res.status(201).json({ status: 'success', data: roles[0] });
  } catch (error) { next(error); }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateRoleSchema.parse(req.body);
    
    // Ensure role exists
    const roles = await sql<Role[]>`SELECT * FROM roles WHERE id = ${id}`;
    const role = roles[0];
    if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });

    // Optional: Prevent editing default 'Owner' role to avoid lockouts
    if (role.name === 'Owner' && data.permissions) {
       // Just ensure they don't remove settings:manage from Owner, or deny edit entirely.
       if (!data.permissions.includes('settings:manage')) {
           return res.status(400).json({ status: 'error', message: 'Owner role must have settings:manage permission' });
       }
    }

    const updatedRoles = await sql<Role[]>`
      UPDATE roles SET ${sql(data as any)}, updated_by = ${req.user?.id || null}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    
    res.json({ status: 'success', data: updatedRoles[0] });
  } catch (error) { next(error); }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const roles = await sql<any[]>`
      SELECT r.*,
             (SELECT COUNT(*) FROM user_shops WHERE role_id = r.id) as _count_user_shops
      FROM roles r
      WHERE r.id = ${id}
    `;
    const role = roles[0];
    
    if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });

    if (role.name === 'Owner') {
      return res.status(400).json({ status: 'error', message: 'Cannot delete the default Owner role' });
    }

    if (Number(role._count_user_shops) > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete role because it is assigned to users' });
    }

    await sql`DELETE FROM roles WHERE id = ${id}`;
    
    res.json({ status: 'success', message: 'Role deleted successfully' });
  } catch (error) { next(error); }
};
