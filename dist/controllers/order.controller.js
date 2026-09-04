"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeliveryStatus = exports.markOrderPaid = exports.getOrders = exports.createOrder = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const access_1 = require("../utils/access");
const fs_1 = __importDefault(require("fs"));
const originalError = console.error;
console.error = function (...args) {
    fs_1.default.appendFileSync('b:\\Brahadeesh\\Projects\\KallaPetty\\Backend\\debug.log', args.map(a => typeof a === 'object' ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : a).join(' ') + '\n');
    originalError.apply(console, args);
};
const createOrder = async (req, res, next) => {
    try {
        const data = app_validator_1.createOrderSchema.parse(req.body);
        await (0, access_1.assertShopAccess)(req.user, data.shop_id);
        await (0, access_1.assertShopPermission)(req.user, data.shop_id, 'pos:access');
        if (data.customer_id)
            await (0, access_1.assertCustomerAccess)(req.user, data.customer_id);
        const productIds = data.items.map(item => item.product_id);
        if (productIds.length === 0)
            throw new access_1.HttpError(400, 'Order must contain at least one item');
        const products = await (0, db_1.default) `
      SELECT * FROM products 
      WHERE id IN ${(0, db_1.default)(productIds)} 
      AND shop_id = ${data.shop_id}
    `;
        if (products.length !== new Set(productIds).size) {
            throw new access_1.HttpError(400, 'One or more products do not belong to the selected shop');
        }
        const productById = new Map(products.map(product => [product.id, product]));
        const calculatedItems = data.items.map(item => {
            const product = productById.get(item.product_id);
            const price = item.price !== undefined && !isNaN(Number(item.price)) ? Number(item.price) : Number(product.price);
            const taxAmount = price * item.qty * (Number(product.tax_rate || 0) / 100);
            return { ...item, price, tax_amount: taxAmount, product };
        });
        const totalAmount = calculatedItems.reduce((sum, item) => sum + item.price * item.qty + item.tax_amount, 0);
        const taxAmount = calculatedItems.reduce((sum, item) => sum + item.tax_amount, 0);
        if (data.discount_amount > totalAmount)
            throw new access_1.HttpError(400, 'Discount cannot exceed bill total');
        const totalToPay = totalAmount - data.discount_amount;
        if (data.amount_paid > totalToPay + 0.05)
            throw new access_1.HttpError(400, 'Amount paid cannot exceed bill total');
        if (data.amount_paid < totalToPay - 0.05 && !data.customer_id) {
            return res.status(400).json({ status: 'error', message: 'Partial payment requires a registered customer.' });
        }
        const status = data.amount_paid < 0.05 ? 'unpaid' : data.amount_paid >= totalToPay - 0.05 ? 'paid' : 'partial';
        const created_by = req.user?.id || null;
        const newOrder = await db_1.default.begin(async (tx) => {
            const orders = await tx `
        INSERT INTO orders ${tx({
                shop_id: data.shop_id,
                customer_id: data.customer_id || null,
                total_amount: totalAmount,
                tax_amount: taxAmount,
                discount_amount: data.discount_amount,
                amount_paid: data.amount_paid,
                status,
                order_type: data.order_type,
                expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
                delivery_address: data.delivery_address || null,
                delivery_status: data.order_type === 'delivery' ? 'pending' : null,
                delivery_notes: data.delivery_notes || null,
                created_by,
            })}
        RETURNING *
      `;
            const order = orders[0];
            for (const item of calculatedItems) {
                await tx `
          INSERT INTO order_items ${tx({
                    order_id: order.id,
                    product_id: item.product_id,
                    qty: item.qty,
                    price: item.price,
                    tax_amount: item.tax_amount,
                    created_by,
                })}
        `;
                if (data.customer_id) {
                    await tx `
            INSERT INTO customer_product_prices (customer_id, product_id, custom_price, updated_at)
            VALUES (${data.customer_id}, ${item.product_id}, ${item.price}, CURRENT_TIMESTAMP)
            ON CONFLICT (customer_id, product_id)
            DO UPDATE SET custom_price = ${item.price}, updated_at = CURRENT_TIMESTAMP
          `;
                }
                if (!item.product.is_service) {
                    const result = await tx `
            UPDATE products SET stock = stock - ${item.qty}
            WHERE id = ${item.product_id} AND stock >= ${item.qty}
            RETURNING stock
          `;
                    if (result.length !== 1)
                        throw new access_1.HttpError(400, `Insufficient stock for ${item.product.name}`);
                    const newStock = result[0].stock;
                    const oldStock = newStock + item.qty;
                    await tx `
            INSERT INTO product_stock_logs ${tx({
                        product_id: item.product_id,
                        shop_id: data.shop_id,
                        change_type: 'sale',
                        qty_change: -item.qty,
                        old_stock: oldStock,
                        new_stock: newStock,
                        reference_id: order.id,
                        created_by
                    })}
          `;
                }
            }
            if (data.amount_paid > 0) {
                await tx `
          INSERT INTO payments ${tx({
                    shop_id: data.shop_id,
                    customer_id: data.customer_id || null,
                    amount: data.amount_paid,
                    received_via: data.received_via,
                    is_order_payment: true,
                    created_by,
                })}
        `;
            }
            return order;
        });
        res.status(201).json({ status: 'success', data: newOrder });
    }
    catch (error) {
        console.error('CREATE ORDER ERROR:', error);
        next(error);
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res, next) => {
    try {
        const shop_id = req.query.shop_id;
        let queryConditions = [];
        if (shop_id)
            queryConditions.push((0, db_1.default) `o.shop_id = ${shop_id}`);
        // SaaS Multi-tenancy: Lock data to the user's business unless superadmin
        if (!req.user?.is_superadmin) {
            if (!req.user?.is_business_owner) {
                const allowedShopIds = Object.keys(req.user?.shop_permissions || {}).filter(id => req.user.shop_permissions[id].includes('invoices:list') || req.user.shop_permissions[id].includes('pos:access'));
                if (shop_id && !allowedShopIds.includes(shop_id))
                    return res.status(403).json({ status: 'error', message: 'Forbidden' });
                if (!shop_id) {
                    if (allowedShopIds.length === 0)
                        return res.status(403).json({ status: 'error', message: 'Forbidden' });
                    queryConditions.push((0, db_1.default) `o.shop_id IN ${(0, db_1.default)(allowedShopIds)}`);
                }
            }
            else {
                queryConditions.push((0, db_1.default) `s.business_id = ${req.user?.business_id}`);
            }
        }
        const whereClause = queryConditions.length > 0
            ? (0, db_1.default) `WHERE ${queryConditions.reduce((acc, curr) => (0, db_1.default) `${acc} AND ${curr}`)}`
            : (0, db_1.default) ``;
        const orders = await (0, db_1.default) `
      SELECT o.*, 
             c.id as c_id, c.name as c_name, c.phone as c_phone,
             (
                SELECT json_agg(json_build_object(
                  'id', oi.id,
                  'order_id', oi.order_id,
                  'product_id', oi.product_id,
                  'qty', oi.qty,
                  'price', oi.price,
                  'tax_amount', oi.tax_amount,
                  'product', (SELECT row_to_json(p.*) FROM products p WHERE p.id = oi.product_id)
                ))
                FROM order_items oi WHERE oi.order_id = o.id
             ) as order_items
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      JOIN shops s ON o.shop_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;
        const formatted = orders.map(o => {
            const { c_id, c_name, c_phone, ...order } = o;
            return {
                ...order,
                customer: c_id ? { id: c_id, name: c_name, phone: c_phone } : null,
                order_items: o.order_items || []
            };
        });
        res.json({ status: 'success', data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrders = getOrders;
const markOrderPaid = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, received_via } = req.body;
        const order = await (0, access_1.assertOrderAccess)(req.user, id);
        await (0, access_1.assertShopPermission)(req.user, order.shop_id, 'invoices:list'); // or pos:access
        const additionalAmount = parseFloat(amount || 0);
        if (!Number.isFinite(additionalAmount) || additionalAmount <= 0)
            throw new access_1.HttpError(400, 'A positive payment amount is required');
        const newAmountPaid = parseFloat(order.amount_paid) + additionalAmount;
        const total = parseFloat(order.total_amount) - parseFloat(order.discount_amount || 0);
        if (newAmountPaid > total)
            throw new access_1.HttpError(400, 'Payment exceeds outstanding balance');
        const newStatus = newAmountPaid >= total ? 'paid' : 'partial';
        const updatedOrder = await db_1.default.begin(async (tx) => {
            const orders = await tx `
        UPDATE orders SET amount_paid = ${newAmountPaid}, status = ${newStatus}
        WHERE id = ${id} RETURNING *
      `;
            const updated = orders[0];
            if (additionalAmount > 0) {
                await tx `
          INSERT INTO payments ${tx({
                    shop_id: order.shop_id,
                    customer_id: order.customer_id || null,
                    amount: additionalAmount,
                    received_via: received_via || 'Cash',
                    is_order_payment: true,
                    created_by: req.user?.id || null,
                })}
        `;
            }
            return updated;
        });
        res.json({ status: 'success', data: updatedOrder });
    }
    catch (error) {
        next(error);
    }
};
exports.markOrderPaid = markOrderPaid;
const updateDeliveryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { delivery_status, delivery_notes } = require('../validators/app.validator').updateDeliveryStatusSchema.parse(req.body);
        const order = await (0, access_1.assertOrderAccess)(req.user, id);
        await (0, access_1.assertShopPermission)(req.user, order.shop_id, 'deliveries:edit');
        let delivered_at = order.delivered_at;
        if (delivery_status === 'delivered' && order.delivery_status !== 'delivered') {
            delivered_at = new Date();
        }
        const orders = await (0, db_1.default) `
      UPDATE orders SET
        delivery_status = ${delivery_status},
        delivery_notes = ${delivery_notes !== undefined ? delivery_notes : order.delivery_notes},
        delivered_at = ${delivered_at}
      WHERE id = ${id} RETURNING *
    `;
        res.json({ status: 'success', data: orders[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateDeliveryStatus = updateDeliveryStatus;
