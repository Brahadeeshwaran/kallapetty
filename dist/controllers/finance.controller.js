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
        const result = await db_1.default.begin(async (tx) => {
            const initialAmount = Number(data.amount);
            let remainingAmount = initialAmount;
            let allocatedToOrders = 0;
            if (data.customer_id && remainingAmount > 0) {
                // Fetch unpaid or partial orders for this customer in this shop (oldest first)
                const pendingOrders = await tx `
          SELECT * FROM orders
          WHERE customer_id = ${data.customer_id}
          AND shop_id = ${data.shop_id}
          AND status IN ('unpaid', 'partial')
          ORDER BY created_at ASC
          FOR UPDATE
        `;
                for (const order of pendingOrders) {
                    const total = Number(order.total_amount) - Number(order.discount_amount || 0);
                    const paid = Number(order.amount_paid || 0);
                    const balance = total - paid;
                    if (balance <= 0)
                        continue;
                    const payForOrder = Math.min(remainingAmount, balance);
                    const newAmountPaid = paid + payForOrder;
                    const newStatus = newAmountPaid >= total - 0.01 ? 'paid' : 'partial';
                    await tx `
            UPDATE orders
            SET amount_paid = ${newAmountPaid}, status = ${newStatus}
            WHERE id = ${order.id}
          `;
                    remainingAmount -= payForOrder;
                    allocatedToOrders += payForOrder;
                    if (remainingAmount <= 0.001)
                        break;
                }
            }
            let primaryPaymentRecord = null;
            // 1. Record order payment portion (if any)
            if (allocatedToOrders > 0) {
                const orderPayments = await tx `
          INSERT INTO payments ${tx({
                    shop_id: data.shop_id,
                    customer_id: data.customer_id,
                    amount: allocatedToOrders,
                    received_via: data.received_via,
                    is_order_payment: true,
                    created_by
                })}
          RETURNING *
        `;
                primaryPaymentRecord = orderPayments[0];
            }
            // 2. Record excess / advance payment portion (if any)
            if (remainingAmount > 0.001 || allocatedToOrders === 0) {
                const excessPayments = await tx `
          INSERT INTO payments ${tx({
                    shop_id: data.shop_id,
                    customer_id: data.customer_id,
                    amount: allocatedToOrders === 0 ? initialAmount : remainingAmount,
                    received_via: data.received_via,
                    is_order_payment: false,
                    created_by
                })}
          RETURNING *
        `;
                if (!primaryPaymentRecord) {
                    primaryPaymentRecord = excessPayments[0];
                }
            }
            return primaryPaymentRecord;
        });
        res.status(201).json({ status: 'success', data: result });
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
