"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierPrices = exports.addSupplierPayment = exports.updateSupplier = exports.getSuppliers = exports.createSupplier = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createSupplier = async (req, res, next) => {
    try {
        const data = app_validator_1.createSupplierSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const suppliers = await (0, db_1.default) `
      INSERT INTO suppliers ${(0, db_1.default)({
            ...data,
            business_id: req.user.business_id,
            created_by,
        })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: suppliers[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createSupplier = createSupplier;
const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await (0, db_1.default) `
      SELECT * FROM suppliers
      WHERE business_id = ${req.user.business_id}
      ORDER BY created_at DESC
    `;
        res.json({ status: 'success', data: suppliers });
    }
    catch (error) {
        next(error);
    }
};
exports.getSuppliers = getSuppliers;
const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = app_validator_1.updateSupplierSchema.parse(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No data provided to update' });
        }
        const supplier = await (0, db_1.default) `
      UPDATE suppliers SET ${(0, db_1.default)(data, Object.keys(data))}
      WHERE id = ${id} AND business_id = ${req.user.business_id}
      RETURNING *
    `;
        if (!supplier.length) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found' });
        }
        res.json({ status: 'success', data: supplier[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSupplier = updateSupplier;
const addSupplierPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { shop_id } = req.query;
        if (!shop_id)
            return res.status(400).json({ status: 'error', message: 'shop_id is required' });
        const data = app_validator_1.createSupplierPaymentSchema.parse({
            ...req.body,
            shop_id: shop_id,
            supplier_id: id
        });
        const created_by = req.user?.id || null;
        const payment = await db_1.default.begin(async (tx) => {
            const pmt = await tx `
        INSERT INTO supplier_payments ${tx({
                shop_id: shop_id,
                supplier_id: id,
                amount_paid: data.amount_paid,
                payment_mode: data.payment_mode,
                reference_number: data.reference_number || null,
                created_by,
            })}
        RETURNING *
      `;
            await tx `
        UPDATE suppliers SET outstanding_balance = outstanding_balance - ${data.amount_paid}
        WHERE id = ${id} AND business_id = ${req.user.business_id}
      `;
            return pmt[0];
        });
        res.status(201).json({ status: 'success', data: payment });
    }
    catch (error) {
        next(error);
    }
};
exports.addSupplierPayment = addSupplierPayment;
const getSupplierPrices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const prices = await (0, db_1.default) `
      SELECT product_id, last_purchase_price 
      FROM supplier_product_prices 
      WHERE supplier_id = ${id}
    `;
        const priceMap = {};
        prices.forEach(p => {
            priceMap[p.product_id] = parseFloat(p.last_purchase_price);
        });
        res.json({ status: 'success', data: priceMap });
    }
    catch (error) {
        next(error);
    }
};
exports.getSupplierPrices = getSupplierPrices;
