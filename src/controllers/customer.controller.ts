import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Customer } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createCustomerSchema, updateCustomerSchema } from '../validators/app.validator';
import { parseExcelBuffer, generateStyledExcelBuffer } from '../utils/excel';
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const created_by = req.user?.id || null;
    const business_id = req.user!.business_id;
    const customers = await sql<Customer[]>`
      INSERT INTO customers ${sql({ ...data, business_id, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: customers[0] });
  } catch (error) { next(error); }
};

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);
    
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No data provided to update' });
    }

    const customer = await sql<Customer[]>`
      UPDATE customers SET ${sql(data as any, Object.keys(data))}
      WHERE id = ${id} AND business_id = ${req.user!.business_id}
      RETURNING *
    `;
    
    if (!customer.length) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    
    res.json({ status: 'success', data: customer[0] });
  } catch (error) { next(error); }
};

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await sql<any[]>`
      SELECT 
        c.id, c.name, c.phone, c.address, c.gst_number, c.opening_balance, c.opening_balance_type, c.created_at,
        COALESCE(
          (SELECT SUM(total_amount - discount_amount - amount_paid) FROM orders WHERE customer_id = c.id), 0
        ) as order_due,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE customer_id = c.id AND is_order_payment = false), 0
        ) as extra_payments
      FROM customers c
      WHERE c.business_id = ${req.user!.business_id} AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;

    const data = customers.map(c => {
      const openingBal = parseFloat(c.opening_balance || '0');
      const initialDue = (c.opening_balance_type === 'to_pay' ? -openingBal : openingBal) || 0;
      const dueAmount = initialDue + parseFloat(c.order_due || '0') - parseFloat(c.extra_payments || '0');
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        gst_number: c.gst_number,
        opening_balance: openingBal,
        opening_balance_type: c.opening_balance_type || 'to_receive',
        created_at: c.created_at,
        due_amount: dueAmount
      };
    });

    res.json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getCustomerPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prices = await sql<any[]>`
      SELECT product_id, custom_price 
      FROM customer_product_prices 
      WHERE customer_id = ${id}
    `;
    const priceMap: Record<string, number> = {};
    prices.forEach(p => {
      priceMap[p.product_id] = parseFloat(p.custom_price);
    });
    res.json({ status: 'success', data: priceMap });
  } catch (error) { next(error); }
};

export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await sql`UPDATE customers SET deleted_at = NOW(), deleted_by = ${req.user!.id} WHERE id = ${req.params.id} AND business_id = ${req.user!.business_id}`;
    if (result.count === 0) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    res.json({ status: 'success', message: 'Customer deleted successfully' });
  } catch (error: any) { 
    next(error); 
  }
};

export const exportCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await sql<any[]>`
      SELECT id, name, phone, address, gst_number, opening_balance, opening_balance_type 
      FROM customers 
      WHERE business_id = ${req.user!.business_id} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    const columns = [
      { header: 'ID (Do Not Edit)', key: 'id', width: 38, hidden: true },
      { header: 'Customer Name', key: 'name', width: 30 },
      { header: 'Mobile Number', key: 'phone', width: 20 },
      { header: 'GST Number', key: 'gst_number', width: 25 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Opening Balance (Rs)', key: 'opening_balance', width: 25 },
      { header: 'Balance Type (to_receive or to_pay)', key: 'opening_balance_type', width: 35, dropdownOptions: ['to_receive', 'to_pay'] }
    ];

    const buffer = await generateStyledExcelBuffer(customers, columns, 'Customers');
    res.setHeader('Content-Disposition', 'attachment; filename="customers_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) { next(error); }
};

export const importCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    const data = await parseExcelBuffer<any>(req.file.buffer);
    if (!data.length) {
      return res.status(400).json({ status: 'error', message: 'Empty excel file' });
    }

    const business_id = req.user!.business_id;
    const created_by = req.user?.id || null;

    // Fetch existing customers to prevent duplicates and allow updates
    const existingCustomers = await sql<any[]>`SELECT id, name, phone FROM customers WHERE business_id = ${business_id} AND deleted_at IS NULL`;
    const existingMapById = new Map<string, string>();
    const existingMapByNamePhone = new Map<string, string>();
    for (const c of existingCustomers) {
      existingMapById.set(c.id, c.id);
      existingMapByNamePhone.set(`${c.name.trim().toLowerCase()}_${c.phone?.trim() || ''}`, c.id);
    }

    let importedCount = 0;
    let updatedCount = 0;
    
    for (const row of data) {
      const excelId = row['ID (Do Not Edit)'] || row.id;
      const name = row['Customer Name'] || row.name;
      if (!name) continue; // skip empty rows
      
      const phone = row['Mobile Number'] || row.phone;
      const phoneStr = phone?.toString().trim() || '';
      const uniqueKey = `${name.toString().trim().toLowerCase()}_${phoneStr}`;

      const gst = row['GST Number'] || row.gst_number;
      const addr = row['Address'] || row.address;
      const ob = row['Opening Balance (Rs)'] || row.opening_balance;
      const type = row['Balance Type (to_receive or to_pay)'] || row.opening_balance_type;

      const payload = {
        name: name.toString(),
        phone: phone?.toString() || null,
        address: addr?.toString() || null,
        gst_number: gst?.toString() || null,
        opening_balance: parseFloat(ob) || 0,
        opening_balance_type: type === 'to_pay' ? 'to_pay' : 'to_receive',
        business_id,
        created_by
      };
      
      try {
        let existingId = null;
        if (excelId && existingMapById.has(excelId)) {
          existingId = excelId;
        } else {
          existingId = existingMapByNamePhone.get(uniqueKey);
        }
        
        if (existingId && existingId !== 'newly_inserted') {
          await sql`UPDATE customers SET ${sql(payload, 'name', 'phone', 'address', 'gst_number', 'opening_balance', 'opening_balance_type')} WHERE id = ${existingId}`;
          updatedCount++;
        } else {
          await sql`INSERT INTO customers ${sql(payload, 'name', 'phone', 'address', 'gst_number', 'opening_balance', 'opening_balance_type', 'business_id', 'created_by')}`;
          importedCount++;
          existingMapByNamePhone.set(uniqueKey, 'newly_inserted'); 
        }
      } catch (err) {
        // ignore duplicate or constraint errors for individual rows, continue with others
        console.error('Row import error', err);
      }
    }
    
    res.json({ status: 'success', message: `Imported ${importedCount} new customers, updated ${updatedCount} existing customers.` });
  } catch (error) { next(error); }
};
