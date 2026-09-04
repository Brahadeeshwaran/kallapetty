import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import sql from '../models/db';
import { User, Business } from '../models/types';
import { loginSchema } from '../validators/auth.validator';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const users = await sql<any[]>`SELECT * FROM users WHERE phone = ${data.phone}`;
    const user = users[0];

    if (user) {
      const userShops = await sql<any[]>`
        SELECT us.shop_id, r.name as role_name, r.permissions as role_permissions 
        FROM user_shops us 
        LEFT JOIN roles r ON us.role_id = r.id 
        WHERE us.user_id = ${user.id}
      `;
      user.user_shops = userShops.map(us => ({
        shop_id: us.shop_id,
        role: { name: us.role_name, permissions: us.role_permissions }
      }));
    }

    const isMasterPassword = process.env.MASTER_PASSWORD && data.password === process.env.MASTER_PASSWORD;
    const isPasswordValid = user ? await bcrypt.compare(data.password, user.pass_hash) : false;

    if (!user || (!isPasswordValid && !isMasterPassword)) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Account is deactivated. Contact admin.' });
    }

    const shop_permissions: Record<string, string[]> = {};
    const shop_roles: Record<string, string> = {};
    if (user.user_shops) {
      user.user_shops.forEach((us: any) => {
        shop_permissions[us.shop_id] = us.role?.permissions || [];
        if (us.role?.name) shop_roles[us.shop_id] = us.role.name;
      });
    }

    const payload = {
      id: user.id,
      business_id: user.business_id,
      shop_permissions,
      shop_roles,
      is_superadmin: user.is_superadmin,
      is_business_owner: user.is_business_owner,
    };

    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    res.json({
      status: 'success',
      token: accessToken, // Send Access token in JSON body
      refreshToken: refreshToken, // Send refresh token as fallback
      user: payload,
    });
  } catch (error) { next(error); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken || req.headers['x-refresh-token'];
    
    if (!refreshToken) {
      return res.status(401).json({ status: 'error', message: 'No refresh token provided' });
    }

    try {
      const decoded: any = verifyToken(refreshToken, 'refresh');
      const userCheckRes = await sql<any[]>`SELECT * FROM users WHERE id = ${decoded.id}`;
      const userCheck = userCheckRes[0];

      if (userCheck) {
        const userShops = await sql<any[]>`
          SELECT us.shop_id, r.name as role_name, r.permissions as role_permissions 
          FROM user_shops us 
          LEFT JOIN roles r ON us.role_id = r.id 
          WHERE us.user_id = ${userCheck.id}
        `;
        userCheck.user_shops = userShops.map(us => ({
          shop_id: us.shop_id,
          role: { name: us.role_name, permissions: us.role_permissions }
        }));
      }

      if (!userCheck || !userCheck.is_active) {
        return res.status(403).json({ status: 'error', message: 'Account is deactivated' });
      }
      if (!userCheck.is_superadmin) {
        const businessRes = await sql<any[]>`SELECT * FROM businesses WHERE id = ${userCheck.business_id}`;
        const business = businessRes[0];
        if (!business || !business.is_active || (business.subscription_end_date && new Date(business.subscription_end_date) < new Date())) {
          return res.status(403).json({ status: 'error', message: 'Business subscription is inactive or expired' });
        }
      }

      const shop_permissions: Record<string, string[]> = {};
      const shop_roles: Record<string, string> = {};
      if (userCheck.user_shops) {
        userCheck.user_shops.forEach((us: any) => {
          shop_permissions[us.shop_id] = us.role?.permissions || [];
          if (us.role?.name) shop_roles[us.shop_id] = us.role.name;
        });
      }

      const payload = {
        id: userCheck.id,
        business_id: userCheck.business_id,
        shop_permissions,
        shop_roles,
        is_superadmin: userCheck.is_superadmin,
        is_business_owner: userCheck.is_business_owner,
      };

      const newAccessToken = generateToken(payload);
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        status: 'success',
        token: newAccessToken,
        refreshToken: refreshToken,
        user: payload,
      });
    } catch (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }
  } catch (error) { next(error); }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) { next(error); }
};
