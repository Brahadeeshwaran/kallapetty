"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importSuppliers = exports.exportSuppliers = exports.deleteSupplier = exports.getSupplierPrices = exports.addSupplierPayment = exports.updateSupplier = exports.getSuppliers = exports.createSupplier = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const excel_1 = require("../utils/excel");
const createSupplier = async (req, res, next) => {
    try {
        const data = app_validator_1.createSupplierSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const openingBal = data.opening_balance || 0;
        const initialOutstanding = data.opening_balance_type === 'to_receive' ? -openingBal : openingBal;
        const suppliers = await (0, db_1.default) `
      INSERT INTO suppliers ${(0, db_1.default)({
            ...data,
            outstanding_balance: initialOutstanding,
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
      WHERE business_id = ${req.user.business_id} AND deleted_at IS NULL
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
            let remainingPayment = Number(data.amount_paid);
            if (remainingPayment > 0) {
                const pendingPOs = await tx `
          SELECT * FROM purchase_orders
          WHERE supplier_id = ${id}
          AND shop_id = ${shop_id}
          AND status IN ('pending', 'partial')
          ORDER BY created_at ASC
          FOR UPDATE
        `;
                for (const po of pendingPOs) {
                    const total = Number(po.total_amount || 0);
                    const paid = Number(po.amount_paid || 0);
                    const balance = total - paid;
                    if (balance <= 0)
                        continue;
                    const payForPO = Math.min(remainingPayment, balance);
                    const newAmountPaid = paid + payForPO;
                    const newStatus = newAmountPaid >= total - 0.01 ? 'completed' : 'partial';
                    await tx `
            UPDATE purchase_orders
            SET amount_paid = ${newAmountPaid}, status = ${newStatus}
            WHERE id = ${po.id}
          `;
                    remainingPayment -= payForPO;
                    if (remainingPayment <= 0.001)
                        break;
                }
            }
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
const deleteSupplier = async (req, res, next) => {
    try {
        const result = await (0, db_1.default) `UPDATE suppliers SET deleted_at = NOW(), deleted_by = ${req.user.id} WHERE id = ${req.params.id} AND business_id = ${req.user.business_id}`;
        if (result.count === 0) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found' });
        }
        res.json({ status: 'success', message: 'Supplier deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSupplier = deleteSupplier;
const exportSuppliers = async (req, res, next) => {
    try {
        const suppliers = await (0, db_1.default) `
      SELECT id, name, phone, gst_number, address, outstanding_balance, opening_balance, opening_balance_type 
      FROM suppliers 
      WHERE business_id = ${req.user.business_id} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
        const columns = [
            { header: 'ID (Do Not Edit)', key: 'id', width: 38, hidden: true },
            { header: 'Supplier Name', key: 'name', width: 30 },
            { header: 'Mobile Number', key: 'phone', width: 20 },
            { header: 'GST Number', key: 'gst_number', width: 25 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Opening Balance (Rs)', key: 'opening_balance', width: 25 },
            { header: 'Balance Type (to_receive or to_pay)', key: 'opening_balance_type', width: 35, dropdownOptions: ['to_receive', 'to_pay'] }
        ];
        const buffer = await (0, excel_1.generateStyledExcelBuffer)(suppliers, columns, 'Suppliers');
        res.setHeader('Content-Disposition', 'attachment; filename="suppliers_template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportSuppliers = exportSuppliers;
const importSuppliers = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }
        const data = await (0, excel_1.parseExcelBuffer)(req.file.buffer);
        if (!data.length) {
            return res.status(400).json({ status: 'error', message: 'Empty excel file' });
        }
        const business_id = req.user.business_id;
        const created_by = req.user?.id || null;
        const existingSuppliers = await (0, db_1.default) `SELECT id, name, phone FROM suppliers WHERE business_id = ${business_id} AND deleted_at IS NULL`;
        const existingMapById = new Map();
        const existingMapByNamePhone = new Map();
        for (const s of existingSuppliers) {
            existingMapById.set(s.id, s.id);
            existingMapByNamePhone.set(`${s.name.trim().toLowerCase()}_${s.phone?.trim() || ''}`, s.id);
        }
        let importedCount = 0;
        let updatedCount = 0;
        for (const row of data) {
            const excelId = row['ID (Do Not Edit)'] || row.id;
            const name = row['Supplier Name'] || row.name;
            if (!name)
                continue;
            const phone = row['Mobile Number'] || row.phone;
            const phoneStr = phone?.toString().trim() || '';
            const uniqueKey = `${name.toString().trim().toLowerCase()}_${phoneStr}`;
            const gst = row['GST Number'] || row.gst_number;
            const addr = row['Address'] || row.address;
            const ob_raw = row['Opening Balance (Rs)'] || row.opening_balance;
            const ob_type_raw = row['Balance Type (to_receive or to_pay)'] || row.opening_balance_type;
            const openingBal = parseFloat(ob_raw) || 0;
            const openingBalType = ob_type_raw === 'to_receive' ? 'to_receive' : 'to_pay';
            const initialOutstanding = openingBalType === 'to_receive' ? -openingBal : openingBal;
            const payload = {
                name: name.toString(),
                phone: phone?.toString() || null,
                gst_number: gst?.toString() || null,
                address: addr?.toString() || null,
                outstanding_balance: initialOutstanding,
                opening_balance: openingBal,
                opening_balance_type: openingBalType,
                business_id,
                created_by
            };
            try {
                let existingId = null;
                if (excelId && existingMapById.has(excelId)) {
                    existingId = excelId;
                }
                else {
                    existingId = existingMapByNamePhone.get(uniqueKey);
                }
                if (existingId && existingId !== 'newly_inserted') {
                    await (0, db_1.default) `UPDATE suppliers SET ${(0, db_1.default)(payload, 'name', 'phone', 'gst_number', 'address', 'outstanding_balance', 'opening_balance', 'opening_balance_type')} WHERE id = ${existingId}`;
                    updatedCount++;
                }
                else {
                    await (0, db_1.default) `INSERT INTO suppliers ${(0, db_1.default)(payload, 'name', 'phone', 'gst_number', 'address', 'outstanding_balance', 'opening_balance', 'opening_balance_type', 'business_id', 'created_by')}`;
                    importedCount++;
                    existingMapByNamePhone.set(uniqueKey, 'newly_inserted');
                }
            }
            catch (err) {
                console.error('Row import error', err);
            }
        }
        res.json({ status: 'success', message: `Imported ${importedCount} new suppliers, updated ${updatedCount} existing suppliers.` });
    }
    catch (error) {
        next(error);
    }
};
exports.importSuppliers = importSuppliers;
