"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receivePurchaseOrder = exports.getPurchaseOrders = exports.createPurchaseOrder = exports.getPurchaseInvoices = exports.createPurchaseInvoice = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createPurchaseInvoice = async (req, res, next) => {
    try {
        const data = app_validator_1.createPurchaseInvoiceSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const result = await db_1.default.begin(async (tx) => {
            // 1. Create Purchase Invoice
            const invoices = await tx `
        INSERT INTO purchase_invoices ${tx({
                shop_id: data.shop_id,
                supplier_id: data.supplier_id,
                invoice_number: data.invoice_number || null,
                total_amount: data.total_amount,
                tax_amount: data.tax_amount,
                discount: data.discount,
                created_by,
            })}
        RETURNING *
      `;
            const invoice = invoices[0];
            for (const item of data.items) {
                await tx `
          INSERT INTO purchase_invoice_items ${tx({
                    invoice_id: invoice.id,
                    product_id: item.product_id,
                    qty_received: item.qty_received,
                    qty_accepted: item.qty_accepted,
                    qty_rejected: item.qty_rejected,
                    purchase_price: item.purchase_price,
                    created_by,
                })}
        `;
                // 2. Update Stock (Only accepted quantity)
                if (item.qty_accepted > 0) {
                    await tx `
            UPDATE products SET stock = stock + ${item.qty_accepted}
            WHERE id = ${item.product_id}
          `;
                }
            }
            // 3. Update Supplier Ledger
            let balanceIncrease = data.total_amount;
            // If payment was made immediately
            if (data.payment_amount > 0) {
                await tx `
          INSERT INTO supplier_payments ${tx({
                    shop_id: data.shop_id,
                    supplier_id: data.supplier_id,
                    amount_paid: data.payment_amount,
                    payment_mode: data.payment_mode,
                    reference_number: data.invoice_number || null,
                    created_by,
                })}
        `;
                balanceIncrease -= data.payment_amount;
            }
            // Update Outstanding Balance
            await tx `
        UPDATE suppliers SET outstanding_balance = outstanding_balance + ${balanceIncrease}
        WHERE id = ${data.supplier_id}
      `;
            return invoice;
        });
        res.status(201).json({ status: 'success', data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.createPurchaseInvoice = createPurchaseInvoice;
const getPurchaseInvoices = async (req, res, next) => {
    try {
        const shopId = req.query.shop_id;
        let queryConditions = [];
        if (shopId) {
            queryConditions.push((0, db_1.default) `pi.shop_id = ${shopId}`);
        }
        else {
            queryConditions.push((0, db_1.default) `s.business_id = ${req.user.business_id}`);
        }
        const whereClause = (0, db_1.default) `WHERE ${queryConditions.reduce((acc, curr) => (0, db_1.default) `${acc} AND ${curr}`)}`;
        const invoices = await (0, db_1.default) `
      SELECT pi.*,
             sup.name as supplier_name,
             (
                SELECT json_agg(json_build_object(
                  'id', pii.id,
                  'invoice_id', pii.invoice_id,
                  'product_id', pii.product_id,
                  'qty_received', pii.qty_received,
                  'qty_accepted', pii.qty_accepted,
                  'qty_rejected', pii.qty_rejected,
                  'purchase_price', pii.purchase_price,
                  'product', json_build_object('name', p.name)
                ))
                FROM purchase_invoice_items pii 
                JOIN products p ON p.id = pii.product_id
                WHERE pii.invoice_id = pi.id
             ) as items
      FROM purchase_invoices pi
      JOIN shops s ON pi.shop_id = s.id
      LEFT JOIN suppliers sup ON pi.supplier_id = sup.id
      ${whereClause}
      ORDER BY pi.created_at DESC
    `;
        const formatted = invoices.map(inv => ({
            ...inv,
            supplier: inv.supplier_name ? { name: inv.supplier_name } : null,
            items: inv.items || []
        }));
        res.json({ status: 'success', data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getPurchaseInvoices = getPurchaseInvoices;
const createPurchaseOrder = async (req, res, next) => {
    try {
        const data = app_validator_1.createPurchaseOrderSchema.parse(req.body);
        const total_amount = data.items.reduce((acc, item) => acc + (item.qty_ordered * item.unit_price), 0);
        const created_by = req.user?.id || null;
        const order = await db_1.default.begin(async (tx) => {
            const orders = await tx `
        INSERT INTO purchase_orders ${tx({
                shop_id: data.shop_id,
                supplier_id: data.supplier_id,
                expected_date: data.expected_date ? new Date(data.expected_date) : null,
                total_amount: total_amount,
                created_by,
            })}
        RETURNING *
      `;
            const po = orders[0];
            for (const item of data.items) {
                await tx `
          INSERT INTO purchase_order_items ${tx({
                    order_id: po.id,
                    product_id: item.product_id,
                    qty_ordered: item.qty_ordered,
                    unit_price: item.unit_price,
                    created_by,
                })}
        `;
            }
            return po;
        });
        res.status(201).json({ status: 'success', data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.createPurchaseOrder = createPurchaseOrder;
const getPurchaseOrders = async (req, res, next) => {
    try {
        const shopId = req.query.shop_id;
        let queryConditions = [];
        if (shopId) {
            queryConditions.push((0, db_1.default) `po.shop_id = ${shopId}`);
        }
        else {
            queryConditions.push((0, db_1.default) `s.business_id = ${req.user.business_id}`);
        }
        const whereClause = (0, db_1.default) `WHERE ${queryConditions.reduce((acc, curr) => (0, db_1.default) `${acc} AND ${curr}`)}`;
        const orders = await (0, db_1.default) `
      SELECT po.*,
             sup.name as supplier_name,
             (
                SELECT json_agg(json_build_object(
                  'id', poi.id,
                  'order_id', poi.order_id,
                  'product_id', poi.product_id,
                  'qty_ordered', poi.qty_ordered,
                  'qty_received', poi.qty_received,
                  'unit_price', poi.unit_price,
                  'product', json_build_object('name', p.name, 'stock', p.stock)
                ))
                FROM purchase_order_items poi 
                JOIN products p ON p.id = poi.product_id
                WHERE poi.order_id = po.id
             ) as items
      FROM purchase_orders po
      JOIN shops s ON po.shop_id = s.id
      LEFT JOIN suppliers sup ON po.supplier_id = sup.id
      ${whereClause}
      ORDER BY po.created_at DESC
    `;
        const formatted = orders.map(po => ({
            ...po,
            supplier: po.supplier_name ? { name: po.supplier_name } : null,
            items: po.items || []
        }));
        res.json({ status: 'success', data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getPurchaseOrders = getPurchaseOrders;
const receivePurchaseOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = app_validator_1.receivePurchaseOrderSchema.parse(req.body);
        const orders = await (0, db_1.default) `SELECT * FROM purchase_orders WHERE id = ${id}`;
        const order = orders[0];
        if (!order)
            return res.status(404).json({ message: 'Purchase order not found' });
        const created_by = req.user?.id || null;
        const result = await db_1.default.begin(async (tx) => {
            // 1. Create Purchase Invoice Linked to PO
            const invoices = await tx `
        INSERT INTO purchase_invoices ${tx({
                shop_id: order.shop_id,
                supplier_id: order.supplier_id,
                purchase_order_id: order.id,
                invoice_number: data.invoice_number || null,
                total_amount: data.total_amount,
                tax_amount: data.tax_amount,
                discount: data.discount,
                created_by,
            })}
        RETURNING *
      `;
            const invoice = invoices[0];
            const receivedItems = data.items.filter(item => item.qty_received > 0);
            for (const item of receivedItems) {
                await tx `
          INSERT INTO purchase_invoice_items ${tx({
                    invoice_id: invoice.id,
                    product_id: item.product_id,
                    qty_received: item.qty_received,
                    qty_accepted: item.qty_accepted,
                    qty_rejected: item.qty_rejected,
                    purchase_price: item.purchase_price,
                    created_by,
                })}
        `;
            }
            // 2. Update Stock & PO Items
            let fullyReceived = true;
            for (const item of data.items) {
                if (item.qty_accepted > 0) {
                    await tx `
            UPDATE products SET stock = stock + ${item.qty_accepted}
            WHERE id = ${item.product_id}
          `;
                }
                // Find corresponding PO item
                const poItems = await tx `
          SELECT * FROM purchase_order_items 
          WHERE order_id = ${order.id} AND product_id = ${item.product_id}
          LIMIT 1
        `;
                const poItem = poItems[0];
                if (poItem) {
                    const newReceived = poItem.qty_received + item.qty_received;
                    await tx `
            UPDATE purchase_order_items SET qty_received = ${newReceived}
            WHERE id = ${poItem.id}
          `;
                    if (newReceived < poItem.qty_ordered)
                        fullyReceived = false;
                }
            }
            // 3. Update PO Status
            await tx `
        UPDATE purchase_orders SET status = ${fullyReceived ? 'completed' : 'partial'}
        WHERE id = ${order.id}
      `;
            // 4. Update Supplier Ledger
            let balanceIncrease = data.total_amount;
            if (data.payment_amount > 0) {
                await tx `
          INSERT INTO supplier_payments ${tx({
                    shop_id: order.shop_id,
                    supplier_id: order.supplier_id,
                    amount_paid: data.payment_amount,
                    payment_mode: data.payment_mode,
                    reference_number: data.invoice_number || null,
                    created_by,
                })}
        `;
                balanceIncrease -= data.payment_amount;
            }
            await tx `
        UPDATE suppliers SET outstanding_balance = outstanding_balance + ${balanceIncrease}
        WHERE id = ${order.supplier_id}
      `;
            return invoice;
        });
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.receivePurchaseOrder = receivePurchaseOrder;
