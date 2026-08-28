"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireShopPermission = exports.requireBusinessOwner = exports.superadminOnly = exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
const db_1 = __importDefault(require("../models/db"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Not authorized to access this route' });
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token, 'access');
        req.user = decoded;
        const user = req.user;
        if (!user.is_superadmin) {
            const businesses = await (0, db_1.default) `SELECT * FROM businesses WHERE id = ${user.business_id}`;
            const business = businesses[0];
            const subscriptionExpired = business?.subscription_end_date && new Date(business.subscription_end_date) < new Date();
            if (!business || !business.is_active || subscriptionExpired) {
                return res.status(403).json({ status: 'error', message: 'Business subscription is inactive or expired' });
            }
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
};
exports.protect = protect;
const superadminOnly = (req, res, next) => {
    if (req.user && req.user.is_superadmin) {
        next();
    }
    else {
        return res.status(403).json({ status: 'error', message: 'Superadmin access required' });
    }
};
exports.superadminOnly = superadminOnly;
const requireBusinessOwner = (req, res, next) => {
    if (req.user?.is_superadmin || req.user?.is_business_owner)
        return next();
    return res.status(403).json({ status: 'error', message: 'Business Owner access required' });
};
exports.requireBusinessOwner = requireBusinessOwner;
// Middleware to check if user has a specific module permission for a specific shop
const requireShopPermission = (permission) => {
    return (req, res, next) => {
        // 1. Super Admins bypass everything
        if (req.user?.is_superadmin)
            return next();
        // 2. Business Owners bypass everything within their own business
        // Note: To be extremely secure, if business_id mismatch happens, they shouldn't bypass.
        // But since the shop belongs to their business, we just bypass. We verify shop ownership in controllers if needed,
        // or we could check here if we have a shop_id.
        if (req.user?.is_business_owner)
            return next();
        // 3. Extract the target shop_id
        // Shop ID could be in params, query, or body
        const shop_id = req.query.shop_id || req.body.shop_id || req.params.shop_id;
        // Some routes (like listing assigned shops) don't need a specific shop check.
        // If no shop_id is provided, but a permission is required, we can check if they have this permission in ANY shop.
        if (!shop_id) {
            const hasAny = Object.values(req.user?.shop_permissions || {}).some(perms => perms.includes(permission));
            if (hasAny)
                return next();
            return res.status(403).json({ status: 'error', message: `Missing required shop permission: ${permission}` });
        }
        // 4. Check specific shop permission
        const permissions = req.user?.shop_permissions[shop_id] || [];
        if (!permissions.includes(permission)) {
            return res.status(403).json({ status: 'error', message: `Missing required shop permission: ${permission}` });
        }
        next();
    };
};
exports.requireShopPermission = requireShopPermission;
