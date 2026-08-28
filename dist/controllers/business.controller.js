"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyBusiness = exports.updateMyBusiness = exports.updateBusiness = exports.getSystemStats = exports.getBusinesses = exports.createBusiness = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createBusiness = async (req, res, next) => {
    try {
        const data = app_validator_1.createBusinessSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const businesses = await (0, db_1.default) `
      INSERT INTO businesses ${(0, db_1.default)({ ...data, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: businesses[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createBusiness = createBusiness;
const getBusinesses = async (req, res, next) => {
    try {
        const businesses = await (0, db_1.default) `
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
    }
    catch (error) {
        next(error);
    }
};
exports.getBusinesses = getBusinesses;
const getSystemStats = async (req, res, next) => {
    try {
        if (!req.user?.is_superadmin)
            return res.status(403).json({ status: 'error', message: 'Forbidden' });
        const [{ count: totalBusinesses }] = await (0, db_1.default) `SELECT COUNT(*) FROM businesses WHERE name != 'KallaPetty Master'`;
        const [{ count: activeBusinesses }] = await (0, db_1.default) `SELECT COUNT(*) FROM businesses WHERE is_active = true AND name != 'KallaPetty Master'`;
        // total shops whose business is not KallaPetty Master
        const [{ count: totalShops }] = await (0, db_1.default) `
      SELECT COUNT(*) FROM shops s 
      JOIN businesses b ON s.business_id = b.id 
      WHERE b.name != 'KallaPetty Master'
    `;
        const [{ count: totalUsers }] = await (0, db_1.default) `
      SELECT COUNT(*) FROM users u 
      JOIN businesses b ON u.business_id = b.id 
      WHERE b.name != 'KallaPetty Master'
    `;
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const [{ count: expiringSoon }] = await (0, db_1.default) `
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
    }
    catch (error) {
        next(error);
    }
};
exports.getSystemStats = getSystemStats;
const updateBusiness = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = require('../validators/app.validator').updateBusinessSchema.parse(req.body);
        if (!req.user?.is_superadmin)
            return res.status(403).json({ status: 'error', message: 'Forbidden' });
        const businesses = await (0, db_1.default) `
      UPDATE businesses SET ${(0, db_1.default)(data)} WHERE id = ${id} RETURNING *
    `;
        res.json({ status: 'success', data: businesses[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBusiness = updateBusiness;
const updateMyBusiness = async (req, res, next) => {
    try {
        const data = require('../validators/app.validator').updateBusinessSchema.parse(req.body);
        // Allow owner/admin to update their own business profile
        if (!req.user?.is_business_owner && !req.user?.is_superadmin) {
            return res.status(403).json({ status: 'error', message: 'Business Owner permission required' });
        }
        const businesses = await (0, db_1.default) `
      UPDATE businesses SET ${(0, db_1.default)(data)} WHERE id = ${req.user.business_id} RETURNING *
    `;
        res.json({ status: 'success', data: businesses[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMyBusiness = updateMyBusiness;
const getMyBusiness = async (req, res, next) => {
    try {
        const businesses = await (0, db_1.default) `SELECT * FROM businesses WHERE id = ${req.user?.business_id}`;
        res.json({ status: 'success', data: businesses[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyBusiness = getMyBusiness;
