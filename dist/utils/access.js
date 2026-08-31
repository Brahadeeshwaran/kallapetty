"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.assertShopAccess = assertShopAccess;
exports.assertShopPermission = assertShopPermission;
exports.assertCustomerAccess = assertCustomerAccess;
exports.assertOrderAccess = assertOrderAccess;
const db_1 = __importDefault(require("../models/db"));
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.HttpError = HttpError;
async function assertShopAccess(user, shopId) {
    const shops = await (0, db_1.default) `SELECT * FROM shops WHERE id = ${shopId}`;
    const shop = shops[0];
    if (!shop)
        throw new HttpError(404, 'Shop not found');
    if (user?.is_superadmin)
        return shop;
    if (shop.business_id !== user?.business_id)
        throw new HttpError(403, 'Forbidden');
    if (!user.is_business_owner) {
        const assignments = await (0, db_1.default) `SELECT * FROM user_shops WHERE user_id = ${user.id} AND shop_id = ${shopId}`;
        const assignment = assignments[0];
        if (!assignment)
            throw new HttpError(403, 'You do not have access to this shop');
    }
    return shop;
}
async function assertShopPermission(user, shopId, permission) {
    if (user?.is_superadmin || user?.is_business_owner)
        return;
    const perms = user?.shop_permissions?.[shopId] || [];
    if (!perms.includes(permission)) {
        throw new HttpError(403, `Missing required shop permission: ${permission}`);
    }
}
async function assertCustomerAccess(user, customerId) {
    const customers = await (0, db_1.default) `SELECT * FROM customers WHERE id = ${customerId}`;
    const customer = customers[0];
    if (!customer)
        throw new HttpError(404, 'Customer not found');
    if (!user?.is_superadmin && customer.business_id !== user?.business_id)
        throw new HttpError(403, 'Forbidden');
    return customer;
}
async function assertOrderAccess(user, orderId) {
    const orders = await (0, db_1.default) `SELECT * FROM orders WHERE id = ${orderId}`;
    const order = orders[0];
    if (!order)
        throw new HttpError(404, 'Order not found');
    await assertShopAccess(user, order.shop_id);
    return order;
}
