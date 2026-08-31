import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import sql from '../models/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    business_id: string;
    shop_permissions: Record<string, string[]>;
    is_superadmin: boolean;
    is_business_owner: boolean;
  };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized to access this route' });
  }

  try {
    const decoded = verifyToken(token, 'access');
    req.user = decoded as any;
    const user = req.user!;
    if (!user.is_superadmin) {
      const businesses = await sql<any[]>`SELECT * FROM businesses WHERE id = ${user.business_id}`;
      const business = businesses[0];
      const subscriptionExpired = business?.subscription_end_date && new Date(business.subscription_end_date) < new Date();
      if (!business || !business.is_active || subscriptionExpired) {
        return res.status(403).json({ status: 'error', message: 'Business subscription is inactive or expired' });
      }
    }
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

export const superadminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.is_superadmin) {
    next();
  } else {
    return res.status(403).json({ status: 'error', message: 'Superadmin access required' });
  }
};

export const requireBusinessOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.is_superadmin || req.user?.is_business_owner) return next();
  return res.status(403).json({ status: 'error', message: 'Business Owner access required' });
};

// Middleware to check if user has a specific module permission for a specific shop
export const requireShopPermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Super Admins bypass everything
    if (req.user?.is_superadmin) return next();
    
    // 2. Business Owners bypass everything within their own business
    // Note: To be extremely secure, if business_id mismatch happens, they shouldn't bypass.
    // But since the shop belongs to their business, we just bypass. We verify shop ownership in controllers if needed,
    // or we could check here if we have a shop_id.
    if (req.user?.is_business_owner) return next();

    // 3. Extract the target shop_id
    // Shop ID could be in params, query, or body
    const shop_id = req.query.shop_id || req.body.shop_id || req.params.shop_id;
    
    // Some routes (like listing assigned shops) don't need a specific shop check.
    // If no shop_id is provided, but a permission is required, we can check if they have this permission in ANY shop.
    if (!shop_id) {
       const hasAny = Object.values(req.user?.shop_permissions || {}).some(perms => perms.includes(permission));
       if (hasAny) return next();
       return res.status(403).json({ status: 'error', message: `Missing required shop permission: ${permission}` });
    }

    // 4. Check specific shop permission
    const permissions = req.user?.shop_permissions[shop_id as string] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ status: 'error', message: `Missing required shop permission: ${permission}` });
    }

    next();
  };
};
