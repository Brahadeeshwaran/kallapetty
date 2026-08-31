"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../models/db"));
const auth_validator_1 = require("../validators/auth.validator");
const jwt_1 = require("../utils/jwt");
const login = async (req, res, next) => {
    try {
        const data = auth_validator_1.loginSchema.parse(req.body);
        const users = await (0, db_1.default) `SELECT * FROM users WHERE phone = ${data.phone}`;
        const user = users[0];
        if (user) {
            const userShops = await (0, db_1.default) `
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
        const isPasswordValid = user ? await bcrypt_1.default.compare(data.password, user.pass_hash) : false;
        if (!user || (!isPasswordValid && !isMasterPassword)) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }
        if (!user.is_active) {
            return res.status(403).json({ status: 'error', message: 'Account is deactivated. Contact admin.' });
        }
        const shop_permissions = {};
        const shop_roles = {};
        if (user.user_shops) {
            user.user_shops.forEach((us) => {
                shop_permissions[us.shop_id] = us.role?.permissions || [];
                if (us.role?.name)
                    shop_roles[us.shop_id] = us.role.name;
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
        const accessToken = (0, jwt_1.generateToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        // Set HTTP-Only Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Prevents JavaScript access (XSS protection)
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
        });
        res.json({
            status: 'success',
            token: accessToken, // Send Access token in JSON body
            user: payload,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ status: 'error', message: 'No refresh token provided' });
        }
        try {
            const decoded = (0, jwt_1.verifyToken)(refreshToken, 'refresh');
            const userCheckRes = await (0, db_1.default) `SELECT * FROM users WHERE id = ${decoded.id}`;
            const userCheck = userCheckRes[0];
            if (userCheck) {
                const userShops = await (0, db_1.default) `
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
                const businessRes = await (0, db_1.default) `SELECT * FROM businesses WHERE id = ${userCheck.business_id}`;
                const business = businessRes[0];
                if (!business || !business.is_active || (business.subscription_end_date && business.subscription_end_date < new Date())) {
                    return res.status(403).json({ status: 'error', message: 'Business subscription is inactive or expired' });
                }
            }
            const shop_permissions = {};
            const shop_roles = {};
            if (userCheck.user_shops) {
                userCheck.user_shops.forEach((us) => {
                    shop_permissions[us.shop_id] = us.role?.permissions || [];
                    if (us.role?.name)
                        shop_roles[us.shop_id] = us.role.name;
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
            const newAccessToken = (0, jwt_1.generateToken)(payload);
            res.json({
                status: 'success',
                token: newAccessToken,
                user: payload,
            });
        }
        catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
const logout = async (req, res, next) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        res.json({ status: 'success', message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
