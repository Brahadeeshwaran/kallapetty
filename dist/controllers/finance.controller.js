"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentsAndExpenses = exports.createExpense = exports.createPayment = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const access_1 = require("../utils/access");
const createPayment = async (req, res, next) => {
    try {
        const data = app_validator_1.createPaymentSchema.parse(req.body);
        await (0, access_1.assertShopAccess)(req.user, data.shop_id);
        await (0, access_1.assertCustomerAccess)(req.user, data.customer_id);
        const created_by = req.user?.id || null;
        const payments = await (0, db_1.default) `
      INSERT INTO payments ${(0, db_1.default)({ ...data, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: payments[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createPayment = createPayment;
const createExpense = async (req, res, next) => {
    try {
        const data = app_validator_1.createExpenseSchema.parse(req.body);
        await (0, access_1.assertShopAccess)(req.user, data.shop_id);
        const created_by = req.user?.id || null;
        const expenses = await (0, db_1.default) `
      INSERT INTO expenses ${(0, db_1.default)({ ...data, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: expenses[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createExpense = createExpense;
const getPaymentsAndExpenses = async (req, res, next) => {
    try {
        const shop_id = req.query.shop_id;
        if (!shop_id)
            throw new access_1.HttpError(400, 'shop_id is required');
        await (0, access_1.assertShopAccess)(req.user, shop_id);
        const payments = await (0, db_1.default) `
      SELECT p.*, 
             c.id as c_id, c.name as c_name, c.phone as c_phone 
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.shop_id = ${shop_id}
      AND DATE(p.created_at AT TIME ZONE 'Asia/Kolkata') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
      ORDER BY p.created_at DESC
    `;
        const formattedPayments = payments.map(p => {
            const { c_id, c_name, c_phone, ...payment } = p;
            return {
                ...payment,
                customer: c_id ? { id: c_id, name: c_name, phone: c_phone } : null
            };
        });
        const expenses = await (0, db_1.default) `
      SELECT * FROM expenses
      WHERE shop_id = ${shop_id}
      AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
      ORDER BY created_at DESC
    `;
        res.json({ status: 'success', data: { payments: formattedPayments, expenses } });
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentsAndExpenses = getPaymentsAndExpenses;
