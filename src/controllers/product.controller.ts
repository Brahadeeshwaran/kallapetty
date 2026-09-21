import { Response, NextFunction } from 'express';
import sql from '../models/db';
import { Product } from '../models/types';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createProductSchema } from '../validators/app.validator';
import { assertShopAccess, assertShopPermission, HttpError } from '../utils/access';
import { parseExcelBuffer, generateStyledExcelBuffer } from '../utils/excel';

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    await assertShopAccess(req.user, data.shop_id);
    await assertShopPermission(req.user, data.shop_id, 'inventory:add');
    const created_by = req.user?.id || null;
    const products = await sql<Product[]>`
      INSERT INTO products ${sql({ ...data, created_by })}
      RETURNING *
    `;
    res.status(201).json({ status: 'success', data: products[0] });
  } catch (error) { next(error); }
};

export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop_id = req.query.shop_id as string;
    const barcode = req.query.barcode as string;
    
    const queryConditions: any[] = [sql`p.deleted_at IS NULL`];
    if (shop_id) queryConditions.push(sql`p.shop_id = ${shop_id}`);
    if (barcode) queryConditions.push(sql`p.barcode = ${barcode}`);

    // SaaS Multi-tenancy: Lock data to the user's business unless superadmin
    if (!req.user?.is_superadmin) {
      if (!req.user?.is_business_owner) {
        // Find which shops the user has 'inventory:list' or 'pos:access' permission for
        const allowedShopIds = Object.keys(req.user?.shop_permissions || {}).filter(
          id => req.user!.shop_permissions[id].includes('inventory:list') || req.user!.shop_permissions[id].includes('pos:access')
        );
        
        if (shop_id && !allowedShopIds.includes(shop_id)) return res.status(403).json({ status: 'error', message: 'Forbidden' });
        
        if (!shop_id) {
            if (allowedShopIds.length === 0) return res.status(403).json({ status: 'error', message: 'Forbidden' });
            queryConditions.push(sql`p.shop_id IN ${sql(allowedShopIds)}`);
        }
      } else {
        queryConditions.push(sql`s.business_id = ${req.user?.business_id!}`);
      }
    }

    const whereClause = queryConditions.length > 0 
      ? sql`WHERE ${queryConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` 
      : sql``;

    const products = await sql<Product[]>`
      SELECT p.* FROM products p
      JOIN shops s ON p.shop_id = s.id
      ${whereClause}
    `;
    res.json({ status: 'success', data: products });
  } catch (error) { next(error); }
};

export const getProductByBarcode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;
    const shop_id = req.query.shop_id as string;
    if (!shop_id) throw new HttpError(400, 'shop_id is required');
    await assertShopAccess(req.user, shop_id);
    const products = await sql<Product[]>`
      SELECT * FROM products
      WHERE barcode = ${barcode} AND shop_id = ${shop_id}
      LIMIT 1
    `;
    const product = products[0];
    
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found with this barcode' });
    }
    
    res.json({ status: 'success', data: product });
  } catch (error) { next(error); }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = require('../validators/app.validator').updateProductSchema.parse(req.body);
    
    // Enforce permissions
    const existings = await sql<Product[]>`SELECT * FROM products WHERE id = ${id}`;
    const existing = existings[0];
    if (!existing) return res.status(404).json({ status: 'error', message: 'Product not found' });
    await assertShopAccess(req.user, existing.shop_id);
    await assertShopPermission(req.user, existing.shop_id, 'inventory:edit');

    const products = await sql<Product[]>`
      UPDATE products SET ${sql(data as any)}
      WHERE id = ${id} RETURNING *
    `;

    // Log if stock changed
    if (data.stock !== undefined && data.stock !== existing.stock) {
      const qty_change = data.stock - existing.stock;
      await sql`
        INSERT INTO product_stock_logs ${sql({
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
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const existings = await sql<Product[]>`SELECT * FROM products WHERE id = ${id}`;
    const existing = existings[0];
    if (!existing) return res.status(404).json({ status: 'error', message: 'Product not found' });
    await assertShopAccess(req.user, existing.shop_id);
    await assertShopPermission(req.user, existing.shop_id, 'inventory:delete');

    await sql`UPDATE products SET deleted_at = NOW(), deleted_by = ${req.user!.id} WHERE id = ${id}`;
    res.json({ status: 'success', message: 'Product deleted' });
  } catch (error) { next(error); }
};

export const getProductStockLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const existings = await sql<Product[]>`SELECT * FROM products WHERE id = ${id}`;
    const existing = existings[0];
    if (!existing) return res.status(404).json({ status: 'error', message: 'Product not found' });
    
    // Check permission using assertShopAccess or check if user is admin
    if (!req.user?.is_superadmin && !req.user?.is_business_owner) {
      await assertShopAccess(req.user, existing.shop_id);
    }

    const logs = await sql`
      SELECT l.*, u.full_name as created_by_name
      FROM product_stock_logs l
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.product_id = ${id}
      ORDER BY l.created_at DESC
    `;
    
    res.json({ status: 'success', data: logs });
  } catch (error) { next(error); }
};

export const exportProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop_id = req.query.shop_id as string;
    if (!shop_id) throw new HttpError(400, 'shop_id is required');
    await assertShopAccess(req.user, shop_id);

    const products = await sql<any[]>`
      SELECT id, name, barcode, price, stock, unit, is_service, tax_rate, tax_type 
      FROM products 
      WHERE shop_id = ${shop_id} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    const shopResult = await sql<any[]>`SELECT allow_service_products FROM shops WHERE id = ${shop_id}`;
    const allow_service_products = shopResult[0]?.allow_service_products || false;

    const columns: any[] = [
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

    const buffer = await generateStyledExcelBuffer(products, columns, 'Inventory');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) { next(error); }
};

export const importProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    // Allow shop_id from body or query since it's form-data
    const shop_id = (req.body.shop_id || req.query.shop_id) as string;
    if (!shop_id) throw new HttpError(400, 'shop_id is required');
    await assertShopAccess(req.user, shop_id);
    await assertShopPermission(req.user, shop_id, 'inventory:add');

    const data = await parseExcelBuffer<any>(req.file.buffer);
    if (!data.length) {
      return res.status(400).json({ status: 'error', message: 'Empty excel file' });
    }

    const created_by = req.user?.id || null;

    const existingProducts = await sql<any[]>`SELECT id, name, barcode FROM products WHERE shop_id = ${shop_id} AND deleted_at IS NULL`;
    const existingMapById = new Map<string, string>();
    const existingMapByBarcodeOrName = new Map<string, string>();
    for (const p of existingProducts) {
      existingMapById.set(p.id, p.id);
      if (p.barcode) existingMapByBarcodeOrName.set(`barcode_${p.barcode}`, p.id);
      else existingMapByBarcodeOrName.set(`name_${p.name.trim().toLowerCase()}`, p.id);
    }

    let importedCount = 0;
    let updatedCount = 0;
    
    for (const row of data) {
      const excelId = row['ID (Do Not Edit)'] || row.id;
      const name = row['Product Name'] || row.name;
      if (!name) continue;
      
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
        } else {
          existingId = existingMapByBarcodeOrName.get(uniqueKey);
        }

        if (existingId && existingId !== 'newly_inserted') {
          await sql`UPDATE products SET ${sql(payload, 'name', 'barcode', 'price', 'stock', 'unit', 'is_service', 'tax_rate', 'tax_type')} WHERE id = ${existingId}`;
          updatedCount++;
        } else {
          await sql`INSERT INTO products ${sql(payload, 'shop_id', 'name', 'barcode', 'price', 'stock', 'unit', 'is_service', 'tax_rate', 'tax_type', 'created_by')}`;
          importedCount++;
          existingMapByBarcodeOrName.set(uniqueKey, 'newly_inserted');
        }
      } catch (err) {
        console.error('Row import error', err);
      }
    }
    
    res.json({ status: 'success', message: `Imported ${importedCount} new products, updated ${updatedCount} existing products.` });
  } catch (error) { next(error); }
};
