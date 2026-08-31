"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.getProductByBarcode = exports.getProducts = exports.createProduct = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const access_1 = require("../utils/access");
const createProduct = async (req, res, next) => {
    try {
        const data = app_validator_1.createProductSchema.parse(req.body);
        await (0, access_1.assertShopAccess)(req.user, data.shop_id);
        await (0, access_1.assertShopPermission)(req.user, data.shop_id, 'inventory:add');
        const created_by = req.user?.id || null;
        const products = await (0, db_1.default) `
      INSERT INTO products ${(0, db_1.default)({ ...data, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: products[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createProduct = createProduct;
const getProducts = async (req, res, next) => {
    try {
        const shop_id = req.query.shop_id;
        const barcode = req.query.barcode;
        let queryConditions = [];
        if (shop_id)
            queryConditions.push((0, db_1.default) `p.shop_id = ${shop_id}`);
        if (barcode)
            queryConditions.push((0, db_1.default) `p.barcode = ${barcode}`);
        // SaaS Multi-tenancy: Lock data to the user's business unless superadmin
        if (!req.user?.is_superadmin) {
            if (!req.user?.is_business_owner) {
                // Find which shops the user has 'inventory:list' or 'pos:access' permission for
                const allowedShopIds = Object.keys(req.user?.shop_permissions || {}).filter(id => req.user.shop_permissions[id].includes('inventory:list') || req.user.shop_permissions[id].includes('pos:access'));
                if (shop_id && !allowedShopIds.includes(shop_id))
                    return res.status(403).json({ status: 'error', message: 'Forbidden' });
                if (!shop_id) {
                    if (allowedShopIds.length === 0)
                        return res.status(403).json({ status: 'error', message: 'Forbidden' });
                    queryConditions.push((0, db_1.default) `p.shop_id IN ${(0, db_1.default)(allowedShopIds)}`);
                }
            }
            else {
                queryConditions.push((0, db_1.default) `s.business_id = ${req.user?.business_id}`);
            }
        }
        const whereClause = queryConditions.length > 0
            ? (0, db_1.default) `WHERE ${queryConditions.reduce((acc, curr) => (0, db_1.default) `${acc} AND ${curr}`)}`
            : (0, db_1.default) ``;
        const products = await (0, db_1.default) `
      SELECT p.* FROM products p
      JOIN shops s ON p.shop_id = s.id
      ${whereClause}
    `;
        res.json({ status: 'success', data: products });
    }
    catch (error) {
        next(error);
    }
};
exports.getProducts = getProducts;
const getProductByBarcode = async (req, res, next) => {
    try {
        const { barcode } = req.params;
        const shop_id = req.query.shop_id;
        if (!shop_id)
            throw new access_1.HttpError(400, 'shop_id is required');
        await (0, access_1.assertShopAccess)(req.user, shop_id);
        const products = await (0, db_1.default) `
      SELECT * FROM products
      WHERE barcode = ${barcode} AND shop_id = ${shop_id}
      LIMIT 1
    `;
        const product = products[0];
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found with this barcode' });
        }
        res.json({ status: 'success', data: product });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductByBarcode = getProductByBarcode;
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = require('../validators/app.validator').updateProductSchema.parse(req.body);
        // Enforce permissions
        const existings = await (0, db_1.default) `SELECT * FROM products WHERE id = ${id}`;
        const existing = existings[0];
        if (!existing)
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        await (0, access_1.assertShopAccess)(req.user, existing.shop_id);
        await (0, access_1.assertShopPermission)(req.user, existing.shop_id, 'inventory:edit');
        const products = await (0, db_1.default) `
      UPDATE products SET ${(0, db_1.default)(data)}
      WHERE id = ${id} RETURNING *
    `;
        res.json({ status: 'success', data: products[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existings = await (0, db_1.default) `SELECT * FROM products WHERE id = ${id}`;
        const existing = existings[0];
        if (!existing)
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        await (0, access_1.assertShopAccess)(req.user, existing.shop_id);
        await (0, access_1.assertShopPermission)(req.user, existing.shop_id, 'inventory:delete');
        await (0, db_1.default) `DELETE FROM products WHERE id = ${id}`;
        res.json({ status: 'success', message: 'Product deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
