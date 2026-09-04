"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerPrices = exports.getCustomers = exports.createCustomer = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createCustomer = async (req, res, next) => {
    try {
        const data = app_validator_1.createCustomerSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const business_id = req.user.business_id;
        const customers = await (0, db_1.default) `
      INSERT INTO customers ${(0, db_1.default)({ ...data, business_id, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: customers[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createCustomer = createCustomer;
const getCustomers = async (req, res, next) => {
    try {
        const customers = await (0, db_1.default) `
      SELECT 
        c.id, c.name, c.phone, c.created_at,
        COALESCE(
          (SELECT SUM(total_amount - discount_amount - amount_paid) FROM orders WHERE customer_id = c.id), 0
        ) as order_due,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE customer_id = c.id AND is_order_payment = false), 0
        ) as extra_payments
      FROM customers c
      WHERE c.business_id = ${req.user.business_id}
    `;
        const data = customers.map(c => {
            const dueAmount = parseFloat(c.order_due) - parseFloat(c.extra_payments);
            return {
                id: c.id,
                name: c.name,
                phone: c.phone,
                created_at: c.created_at,
                due_amount: dueAmount > 0 ? dueAmount : 0
            };
        });
        res.json({ status: 'success', data });
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomers = getCustomers;
const getCustomerPrices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const prices = await (0, db_1.default) `
      SELECT product_id, custom_price 
      FROM customer_product_prices 
      WHERE customer_id = ${id}
    `;
        const priceMap = {};
        prices.forEach(p => {
            priceMap[p.product_id] = parseFloat(p.custom_price);
        });
        res.json({ status: 'success', data: priceMap });
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomerPrices = getCustomerPrices;
