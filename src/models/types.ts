export interface Business {
  id: string;
  name: string;
  owner_phone: string;
  subscription_end_date: Date | null;
  is_active: boolean;
  address: string | null;
  gst_number: string | null;
  upi_id: string | null;
  bank_details: string | null;
  terms_conditions: string | null;
  logo_url: string | null;
  invoice_format: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Role {
  id: string;
  shop_id: string;
  name: string;
  permissions: string[];
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Shop {
  id: string;
  business_id: string;
  name: string;
  subscription_start_date: Date | null;
  subscription_end_date: Date | null;
  last_paid_date: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface User {
  id: string;
  business_id: string;
  phone: string;
  pass_hash: string;
  is_superadmin: boolean;
  is_business_owner: boolean;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface UserShop {
  user_id: string;
  shop_id: string;
  role_id: string;
  created_at: Date;
  deleted_at: Date | null;
  created_by: string | null;
  deleted_by: string | null;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  is_service: boolean;
  tax_rate: number;
  tax_type: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string | null;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  amount_paid: number;
  status: string;
  order_type: string;
  expected_delivery: Date | null;
  delivery_address: string | null;
  delivery_status: string | null;
  delivery_notes: string | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  price: number;
  tax_amount: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Payment {
  id: string;
  shop_id: string;
  customer_id: string | null;
  amount: number;
  received_via: string;
  is_order_payment: boolean;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Expense {
  id: string;
  shop_id: string;
  amount: number;
  reason: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  gst_number: string | null;
  address: string | null;
  outstanding_balance: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseOrder {
  id: string;
  shop_id: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  expected_date: Date | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_price: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseInvoice {
  id: string;
  shop_id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string | null;
  status: string;
  total_amount: number;
  tax_amount: number;
  discount: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  purchase_price: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface SupplierPayment {
  id: string;
  shop_id: string;
  supplier_id: string;
  amount_paid: number;
  payment_mode: string;
  reference_number: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseReturn {
  id: string;
  shop_id: string;
  supplier_id: string;
  reason: string | null;
  total_amount: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface PurchaseReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  qty_returned: number;
  refund_price: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
}
