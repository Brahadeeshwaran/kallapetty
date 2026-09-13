"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerPrices = exports.getCustomers = exports.updateCustomer = exports.createCustomer = void 0;
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
const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = app_validator_1.updateCustomerSchema.parse(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No data provided to update' });
        }
        const customer = await (0, db_1.default) `
      UPDATE customers SET ${(0, db_1.default)(data, Object.keys(data))}
      WHERE id = ${id} AND business_id = ${req.user.business_id}
      RETURNING *
    `;
        if (!customer.length) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        res.json({ status: 'success', data: customer[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCustomer = updateCustomer;
const getCustomers = async (req, res, next) => {
    try {
        const customers = await (0, db_1.default) `
      SELECT 
        c.id, c.name, c.phone, c.address, c.gst_number, c.opening_balance, c.opening_balance_type, c.created_at,
        COALESCE(
          (SELECT SUM(total_amount - discount_amount - amount_paid) FROM orders WHERE customer_id = c.id), 0
        ) as order_due,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE customer_id = c.id AND is_order_payment = false), 0
        ) as extra_payments
      FROM customers c
      WHERE c.business_id = ${req.user.business_id}
      ORDER BY c.created_at DESC
    `;
        const data = customers.map(c => {
            const openingBal = parseFloat(c.opening_balance || '0');
            const initialDue = (c.opening_balance_type === 'to_pay' ? -openingBal : openingBal) || 0;
            const dueAmount = initialDue + parseFloat(c.order_due || '0') - parseFloat(c.extra_payments || '0');
            return {
                id: c.id,
                name: c.name,
                phone: c.phone,
                address: c.address,
                gst_number: c.gst_number,
                opening_balance: openingBal,
                opening_balance_type: c.opening_balance_type || 'to_receive',
                created_at: c.created_at,
                due_amount: dueAmount
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
