"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markShopPaid = exports.updateShop = exports.getShops = exports.createShop = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createShop = async (req, res, next) => {
    try {
        const data = app_validator_1.createShopSchema.parse(req.body);
        let targetBusinessId = req.user.business_id;
        if (req.user?.is_superadmin && data.business_id) {
            targetBusinessId = data.business_id;
        }
        const created_by = req.user?.id || null;
        const shops = await (0, db_1.default) `
      INSERT INTO shops (name, business_id, created_by)
      VALUES (${data.name}, ${targetBusinessId}, ${created_by})
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: shops[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createShop = createShop;
const getShops = async (req, res, next) => {
    try {
        let shops;
        const businessIdQuery = req.query.business_id;
        if (req.user?.is_superadmin) {
            if (businessIdQuery) {
                shops = await (0, db_1.default) `SELECT * FROM shops WHERE business_id = ${businessIdQuery}`;
            }
            else {
                shops = await (0, db_1.default) `SELECT * FROM shops`;
            }
        }
        else if (req.user?.is_business_owner) {
            shops = await (0, db_1.default) `SELECT * FROM shops WHERE business_id = ${req.user.business_id}`;
        }
        else {
            shops = await (0, db_1.default) `
        SELECT s.* FROM shops s
        JOIN user_shops us ON s.id = us.shop_id
        WHERE us.user_id = ${req.user.id}
      `;
        }
        res.json({ status: 'success', data: shops });
    }
    catch (error) {
        next(error);
    }
};
exports.getShops = getShops;
const updateShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = require('../validators/app.validator').updateShopSchema.parse(req.body);
        // Ensure ownership if not superadmin
        if (!req.user?.is_superadmin) {
            const existings = await (0, db_1.default) `SELECT * FROM shops WHERE id = ${id}`;
            const existing = existings[0];
            if (existing?.business_id !== req.user?.business_id)
                return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
        const shops = await (0, db_1.default) `
      UPDATE shops SET ${(0, db_1.default)(data)}
      WHERE id = ${id} RETURNING *
    `;
        res.json({ status: 'success', data: shops[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateShop = updateShop;
const markShopPaid = async (req, res, next) => {
    try {
        if (!req.user?.is_superadmin)
            return res.status(403).json({ status: 'error', message: 'Forbidden' });
        const { id } = req.params;
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30); // 30 days logic
        const shops = await (0, db_1.default) `
      UPDATE shops SET 
        last_paid_date = NOW(),
        subscription_end_date = ${nextMonth},
        is_active = true
      WHERE id = ${id} RETURNING *
    `;
        res.json({ status: 'success', data: shops[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.markShopPaid = markShopPaid;
