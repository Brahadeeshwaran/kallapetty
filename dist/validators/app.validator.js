"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payPurchaseOrderSchema = exports.receivePurchaseOrderSchema = exports.createPurchaseOrderSchema = exports.createSupplierPaymentSchema = exports.createPurchaseInvoiceSchema = exports.updateSupplierSchema = exports.createSupplierSchema = exports.updateTransportSchema = exports.updateDeliveryStatusSchema = exports.createExpenseSchema = exports.createPaymentSchema = exports.createOrderSchema = exports.updateProductSchema = exports.resetShopDataSchema = exports.updateShopSchema = exports.updateBusinessSchema = exports.createProductSchema = exports.updateCustomerSchema = exports.createCustomerSchema = exports.createShopSchema = exports.createBusinessSchema = void 0;
const zod_1 = require("zod");
exports.createBusinessSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    owner_phone: zod_1.z.string().min(10),
    subscription_end_date: zod_1.z.string().datetime().optional(),
    address: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    upi_id: zod_1.z.string().optional(),
    bank_details: zod_1.z.string().optional(),
    terms_conditions: zod_1.z.string().optional(),
    logo_url: zod_1.z.string().optional(),
    invoice_format: zod_1.z.enum(['thermal', 'a4']).optional(),
});
exports.createShopSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    business_id: zod_1.z.string().uuid().optional(),
    allow_service_products: zod_1.z.boolean().optional(),
});
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    opening_balance: zod_1.z.number().nonnegative().optional().default(0),
    opening_balance_type: zod_1.z.enum(['to_receive', 'to_pay']).optional().default('to_receive'),
});
exports.updateCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    opening_balance: zod_1.z.number().nonnegative().optional(),
    opening_balance_type: zod_1.z.enum(['to_receive', 'to_pay']).optional(),
});
exports.createProductSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(3),
    barcode: zod_1.z.string().optional(),
    price: zod_1.z.number().positive(),
    stock: zod_1.z.number().int().nonnegative(),
    is_service: zod_1.z.boolean().default(false),
    tax_rate: zod_1.z.number().nonnegative().default(0),
    tax_type: zod_1.z.enum(['flat', 'gst']).default('flat'),
    unit: zod_1.z.string().optional().default('Pcs'),
    custom_attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().default({}),
});
exports.updateBusinessSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    owner_phone: zod_1.z.string().min(10).optional(),
    address: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    upi_id: zod_1.z.string().optional(),
    bank_details: zod_1.z.string().optional(),
    terms_conditions: zod_1.z.string().optional(),
    logo_url: zod_1.z.string().optional(),
    invoice_format: zod_1.z.enum(['thermal', 'a4']).optional(),
});
exports.updateShopSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    invoice_prefix: zod_1.z.string().optional(),
    invoice_suffix: zod_1.z.string().optional(),
    next_invoice_number: zod_1.z.number().int().positive().optional(),
    invoice_padding: zod_1.z.number().int().min(1).max(10).optional(),
    allow_data_reset: zod_1.z.boolean().optional(),
    allow_service_products: zod_1.z.boolean().optional(),
    custom_column_definitions: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        scope: zod_1.z.enum(['product', 'pos', 'system']),
        align: zod_1.z.string().optional(),
        show_on_invoice: zod_1.z.boolean().default(true),
        default_value: zod_1.z.string().optional(),
    })).optional(),
});
exports.resetShopDataSchema = zod_1.z.object({
    confirmation: zod_1.z.literal('RESET'),
    reset_stock_to_zero: zod_1.z.boolean().optional().default(false),
    reset_opening_balances: zod_1.z.boolean().optional().default(false),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    barcode: zod_1.z.string().optional(),
    price: zod_1.z.number().positive().optional(),
    stock: zod_1.z.number().int().nonnegative().optional(),
    tax_rate: zod_1.z.number().nonnegative().optional(),
    tax_type: zod_1.z.enum(['flat', 'gst']).optional(),
    unit: zod_1.z.string().optional(),
    custom_attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.createOrderSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    customer_id: zod_1.z.string().uuid().optional(),
    total_amount: zod_1.z.number().nonnegative().optional(),
    tax_amount: zod_1.z.number().nonnegative().optional(),
    discount_amount: zod_1.z.number().nonnegative().default(0),
    amount_paid: zod_1.z.number().nonnegative(),
    status: zod_1.z.enum(['paid', 'partial', 'unpaid']).optional(),
    received_via: zod_1.z.enum(['Cash', 'UPI']).default('Cash'),
    order_type: zod_1.z.enum(['pos', 'delivery']).default('pos'),
    expected_delivery: zod_1.z.string().datetime().optional(),
    delivery_address: zod_1.z.string().optional(),
    delivery_notes: zod_1.z.string().optional(),
    transport_name: zod_1.z.string().optional(),
    lr_number: zod_1.z.string().optional(),
    lr_date: zod_1.z.string().optional(),
    is_interstate: zod_1.z.boolean().optional(),
    invoice_number: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.string().uuid(),
        qty: zod_1.z.number().positive(),
        price: zod_1.z.number().nonnegative().optional(),
        tax_amount: zod_1.z.number().nonnegative().optional(),
        unit: zod_1.z.string().optional(),
        custom_inputs: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    })).min(1),
});
exports.createPaymentSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    customer_id: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    received_via: zod_1.z.enum(['Cash', 'UPI']),
});
exports.createExpenseSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    reason: zod_1.z.string().min(3),
});
exports.updateDeliveryStatusSchema = zod_1.z.object({
    delivery_status: zod_1.z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
    delivery_notes: zod_1.z.string().optional(),
});
exports.updateTransportSchema = zod_1.z.object({
    transport_name: zod_1.z.string().optional(),
    lr_number: zod_1.z.string().optional(),
    lr_date: zod_1.z.string().optional(),
    delivery_address: zod_1.z.string().optional(),
    delivery_notes: zod_1.z.string().optional(),
    is_interstate: zod_1.z.boolean().optional(),
});
exports.createSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    phone: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    opening_balance: zod_1.z.number().nonnegative().optional().default(0),
    opening_balance_type: zod_1.z.enum(['to_pay', 'to_receive']).optional().default('to_pay'),
});
exports.updateSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    phone: zod_1.z.string().optional(),
    gst_number: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
});
exports.createPurchaseInvoiceSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    supplier_id: zod_1.z.string().uuid(),
    invoice_number: zod_1.z.string().optional(),
    total_amount: zod_1.z.number().nonnegative(),
    tax_amount: zod_1.z.number().nonnegative().default(0),
    discount: zod_1.z.number().nonnegative().default(0),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.string().uuid(),
        qty_received: zod_1.z.number().int().positive(),
        qty_accepted: zod_1.z.number().int().nonnegative(),
        qty_rejected: zod_1.z.number().int().nonnegative(),
        purchase_price: zod_1.z.number().nonnegative(),
    })).min(1),
    payment_amount: zod_1.z.number().nonnegative().default(0),
    payment_mode: zod_1.z.string().default('cash'),
});
exports.createSupplierPaymentSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    supplier_id: zod_1.z.string().uuid(),
    amount_paid: zod_1.z.number().positive(),
    payment_mode: zod_1.z.string(),
    reference_number: zod_1.z.string().optional(),
});
exports.createPurchaseOrderSchema = zod_1.z.object({
    shop_id: zod_1.z.string().uuid(),
    supplier_id: zod_1.z.string().uuid(),
    expected_date: zod_1.z.string().datetime().optional(),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.string().uuid(),
        qty_ordered: zod_1.z.coerce.number().int().positive(),
        unit_price: zod_1.z.coerce.number().nonnegative(),
    })).min(1),
});
exports.receivePurchaseOrderSchema = zod_1.z.object({
    invoice_number: zod_1.z.string().optional(),
    total_amount: zod_1.z.coerce.number().nonnegative(),
    tax_amount: zod_1.z.coerce.number().nonnegative().default(0),
    discount: zod_1.z.coerce.number().nonnegative().default(0),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.string().uuid(),
        qty_received: zod_1.z.coerce.number().int().nonnegative(),
        qty_accepted: zod_1.z.coerce.number().int().nonnegative(),
        qty_rejected: zod_1.z.coerce.number().int().nonnegative(),
        purchase_price: zod_1.z.coerce.number().nonnegative(),
    })).min(1),
    payment_amount: zod_1.z.coerce.number().nonnegative().default(0),
    payment_mode: zod_1.z.string().default('cash'),
});
exports.payPurchaseOrderSchema = zod_1.z.object({
    payment_amount: zod_1.z.coerce.number().positive(),
    payment_mode: zod_1.z.string().default('cash'),
    reference_number: zod_1.z.string().optional(),
});
