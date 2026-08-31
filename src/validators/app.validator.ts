import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(3),
  owner_phone: z.string().min(10),
  subscription_end_date: z.string().datetime().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  upi_id: z.string().optional(),
  bank_details: z.string().optional(),
  terms_conditions: z.string().optional(),
  logo_url: z.string().optional(),
  invoice_format: z.enum(['thermal', 'a4']).optional(),
});

export const createShopSchema = z.object({
  name: z.string().min(3),
  business_id: z.string().uuid().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(3),
  phone: z.string().optional(),
});

export const createProductSchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(3),
  barcode: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  is_service: z.boolean().default(false),
  tax_rate: z.number().nonnegative().default(0),
  tax_type: z.enum(['flat', 'gst']).default('flat'),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(3).optional(),
  owner_phone: z.string().min(10).optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  upi_id: z.string().optional(),
  bank_details: z.string().optional(),
  terms_conditions: z.string().optional(),
  logo_url: z.string().optional(),
  invoice_format: z.enum(['thermal', 'a4']).optional(),
});

export const updateShopSchema = z.object({
  name: z.string().min(3),
});

export const updateProductSchema = z.object({
  name: z.string().min(3).optional(),
  barcode: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  tax_rate: z.number().nonnegative().optional(),
  tax_type: z.enum(['flat', 'gst']).optional(),
});

export const createOrderSchema = z.object({
  shop_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  total_amount: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  discount_amount: z.number().nonnegative().default(0),
  amount_paid: z.number().nonnegative(),
  status: z.enum(['paid', 'partial', 'unpaid']).optional(),
  received_via: z.enum(['Cash', 'UPI']).default('Cash'),
  order_type: z.enum(['pos', 'delivery']).default('pos'),
  expected_delivery: z.string().datetime().optional(),
  delivery_address: z.string().optional(),
  delivery_notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty: z.number().int().positive(),
    price: z.number().nonnegative().optional(),
    tax_amount: z.number().nonnegative().optional(),
  })).min(1),
});

export const createPaymentSchema = z.object({
  shop_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  received_via: z.enum(['Cash', 'UPI']),
});

export const createExpenseSchema = z.object({
  shop_id: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(3),
});

export const updateDeliveryStatusSchema = z.object({
  delivery_status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
  delivery_notes: z.string().optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(3),
  phone: z.string().optional(),
  gst_number: z.string().optional(),
  address: z.string().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().optional(),
  gst_number: z.string().optional(),
  address: z.string().optional(),
});

export const createPurchaseInvoiceSchema = z.object({
  shop_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  invoice_number: z.string().optional(),
  total_amount: z.number().nonnegative(),
  tax_amount: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty_received: z.number().int().positive(),
    qty_accepted: z.number().int().nonnegative(),
    qty_rejected: z.number().int().nonnegative(),
    purchase_price: z.number().nonnegative(),
  })).min(1),
  payment_amount: z.number().nonnegative().default(0),
  payment_mode: z.string().default('cash'),
});

export const createSupplierPaymentSchema = z.object({
  shop_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  amount_paid: z.number().positive(),
  payment_mode: z.string(),
  reference_number: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  shop_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expected_date: z.string().datetime().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty_ordered: z.coerce.number().int().positive(),
    unit_price: z.coerce.number().nonnegative(),
  })).min(1),
});

export const receivePurchaseOrderSchema = z.object({
  invoice_number: z.string().optional(),
  total_amount: z.coerce.number().nonnegative(),
  tax_amount: z.coerce.number().nonnegative().default(0),
  discount: z.coerce.number().nonnegative().default(0),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty_received: z.coerce.number().int().nonnegative(),
    qty_accepted: z.coerce.number().int().nonnegative(),
    qty_rejected: z.coerce.number().int().nonnegative(),
    purchase_price: z.coerce.number().nonnegative(),
  })).min(1),
  payment_amount: z.coerce.number().nonnegative().default(0),
  payment_mode: z.string().default('cash'),
});

export const payPurchaseOrderSchema = z.object({
  payment_amount: z.coerce.number().positive(),
  payment_mode: z.string().default('cash'),
  reference_number: z.string().optional(),
});
