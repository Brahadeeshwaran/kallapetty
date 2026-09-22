"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProducts = exports.exportProducts = exports.getProductStockLogs = exports.deleteProduct = exports.updateProduct = exports.getProductByBarcode = exports.getProducts = exports.createProduct = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const access_1 = require("../utils/access");
const excel_1 = require("../utils/excel");
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
        const queryConditions = [(0, db_1.default) `p.deleted_at IS NULL`];
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
        // Log if stock changed
        if (data.stock !== undefined && data.stock !== existing.stock) {
            const qty_change = data.stock - existing.stock;
            await (0, db_1.default) `
        INSERT INTO product_stock_logs ${(0, db_1.default)({
                product_id: id,
                shop_id: existing.shop_id,
                change_type: 'manual_adjust',
                qty_change,
                old_stock: existing.stock,
                new_stock: data.stock,
                created_by: req.user?.id || null
            })}
      `;
        }
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
        await (0, db_1.default) `UPDATE products SET deleted_at = NOW(), deleted_by = ${req.user.id} WHERE id = ${id}`;
        res.json({ status: 'success', message: 'Product deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
const getProductStockLogs = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existings = await (0, db_1.default) `SELECT * FROM products WHERE id = ${id}`;
        const existing = existings[0];
        if (!existing)
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        // Check permission using assertShopAccess or check if user is admin
        if (!req.user?.is_superadmin && !req.user?.is_business_owner) {
            await (0, access_1.assertShopAccess)(req.user, existing.shop_id);
        }
        const logs = await (0, db_1.default) `
      SELECT l.*, u.full_name as created_by_name
      FROM product_stock_logs l
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.product_id = ${id}
      ORDER BY l.created_at DESC
    `;
        res.json({ status: 'success', data: logs });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductStockLogs = getProductStockLogs;
const exportProducts = async (req, res, next) => {
    try {
        const shop_id = req.query.shop_id;
        if (!shop_id)
            throw new access_1.HttpError(400, 'shop_id is required');
        await (0, access_1.assertShopAccess)(req.user, shop_id);
        const products = await (0, db_1.default) `
      SELECT id, name, barcode, price, stock, unit, is_service, tax_rate, tax_type 
      FROM products 
      WHERE shop_id = ${shop_id} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
        const shopResult = await (0, db_1.default) `SELECT allow_service_products FROM shops WHERE id = ${shop_id}`;
        const allow_service_products = shopResult[0]?.allow_service_products || false;
        const columns = [
            { header: 'ID (Do Not Edit)', key: 'id', width: 38, hidden: true },
            { header: 'Product Name', key: 'name', width: 35 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Price (Rs)', key: 'price', width: 15 },
            { header: 'Stock Quantity', key: 'stock', width: 20 },
            { header: 'Unit (Pcs, Kg, etc)', key: 'unit', width: 20 },
            { header: 'Tax Rate (%)', key: 'tax_rate', width: 15 },
            { header: 'Tax Type (flat or gst)', key: 'tax_type', width: 25, dropdownOptions: ['flat', 'gst'] }
        ];
        if (allow_service_products) {
            columns.push({ header: 'Is Service (TRUE/FALSE)', key: 'is_service', width: 25, dropdownOptions: ['TRUE', 'FALSE'] });
        }
        const buffer = await (0, excel_1.generateStyledExcelBuffer)(products, columns, 'Inventory');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory_template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportProducts = exportProducts;
const importProducts = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }
        // Allow shop_id from body or query since it's form-data
        const shop_id = (req.body.shop_id || req.query.shop_id);
        if (!shop_id)
            throw new access_1.HttpError(400, 'shop_id is required');
        await (0, access_1.assertShopAccess)(req.user, shop_id);
        await (0, access_1.assertShopPermission)(req.user, shop_id, 'inventory:add');
        const data = await (0, excel_1.parseExcelBuffer)(req.file.buffer);
        if (!data.length) {
            return res.status(400).json({ status: 'error', message: 'Empty excel file' });
        }
        const created_by = req.user?.id || null;
        const existingProducts = await (0, db_1.default) `SELECT id, name, barcode FROM products WHERE shop_id = ${shop_id} AND deleted_at IS NULL`;
        const existingMapById = new Map();
        const existingMapByBarcodeOrName = new Map();
        for (const p of existingProducts) {
            existingMapById.set(p.id, p.id);
            if (p.barcode)
                existingMapByBarcodeOrName.set(`barcode_${p.barcode}`, p.id);
            else
                existingMapByBarcodeOrName.set(`name_${p.name.trim().toLowerCase()}`, p.id);
        }
        let importedCount = 0;
        let updatedCount = 0;
        for (const row of data) {
            const excelId = row['ID (Do Not Edit)'] || row.id;
            const name = row['Product Name'] || row.name;
            if (!name)
                continue;
            const barcode = row['Barcode'] || row.barcode;
            const uniqueKey = barcode ? `barcode_${barcode.toString()}` : `name_${name.toString().trim().toLowerCase()}`;
            const price = row['Price (Rs)'] || row.price;
            const stock = row['Stock Quantity'] || row.stock;
            const unit = row['Unit (Pcs, Kg, etc)'] || row.unit;
            const taxRate = row['Tax Rate (%)'] || row.tax_rate;
            const taxType = row['Tax Type (flat or gst)'] || row.tax_type;
            const isService = row['Is Service (TRUE/FALSE)'] || row.is_service;
            const payload = {
                shop_id,
                name: name.toString(),
                barcode: barcode?.toString() || null,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                unit: unit?.toString() || 'Pcs',
                is_service: isService === 'true' || isService === 'TRUE' || isService === true,
                tax_rate: parseFloat(taxRate) || 0,
                tax_type: taxType?.toString() || 'inclusive',
                created_by
            };
            try {
                let existingId = null;
                if (excelId && existingMapById.has(excelId)) {
                    existingId = excelId;
                }
                else {
                    existingId = existingMapByBarcodeOrName.get(uniqueKey);
                }
                if (existingId && existingId !== 'newly_inserted') {
                    await (0, db_1.default) `UPDATE products SET ${(0, db_1.default)(payload, 'name', 'barcode', 'price', 'stock', 'unit', 'is_service', 'tax_rate', 'tax_type')} WHERE id = ${existingId}`;
                    updatedCount++;
                }
                else {
                    await (0, db_1.default) `INSERT INTO products ${(0, db_1.default)(payload, 'shop_id', 'name', 'barcode', 'price', 'stock', 'unit', 'is_service', 'tax_rate', 'tax_type', 'created_by')}`;
                    importedCount++;
                    existingMapByBarcodeOrName.set(uniqueKey, 'newly_inserted');
                }
            }
            catch (err) {
                console.error('Row import error', err);
            }
        }
        res.json({ status: 'success', message: `Imported ${importedCount} new products, updated ${updatedCount} existing products.` });
    }
    catch (error) {
        next(error);
    }
};
exports.importProducts = importProducts;
