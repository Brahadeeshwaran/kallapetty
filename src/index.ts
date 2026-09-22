import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import sql from './models/db';
import { setupSwagger } from './utils/swagger';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import businessRoutes from './routes/business.routes';
import shopRoutes from './routes/shop.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import financeRoutes from './routes/finance.routes';
import roleRoutes from './routes/role.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || allowedOrigins.length === 0)) {
  throw new Error('JWT_SECRET and CORS_ORIGIN must be configured in production');
}

app.set('trust proxy', 1);
app.disable('etag'); // Prevent 304 Not Modified responses

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true, // Required to send cookies cross-origin
}));

// Prevent browser caching for all API routes
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Setup Swagger UI
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);

// Basic health check route
app.get('/', async (req: Request, res: Response) => {
  try {
    // Simple query to verify DB connection is active
    await sql`SELECT 1`;
    res.json({ message: 'Server is running and Database is connected successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server running but DB connection failed.' });
  }
});

// Global Error Handler (must be after all routes)
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  logger.info(`[server]: Server is running at port ${port}`);
  try {
    await sql`SELECT 1`;
    
    // 1. Run full schema.sql to create any newly added tables (like purchase_orders, etc) safely
    const fs = require('fs');
    const path = require('path');
    try {
      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await sql.unsafe(schema);
        logger.info('[database]: schema.sql executed successfully (missing tables created).');
      }
    } catch (err) {
      logger.error('[database]: Failed to execute schema.sql', err);
    }

    // 2. Comprehensive ALTER TABLE for all existing tables that got new columns
    // Businesses
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_details TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS terms_conditions TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_format VARCHAR(50) DEFAULT 'thermal';`;

    // Customers
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(10, 2) DEFAULT 0;`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance_type VARCHAR(20) DEFAULT 'to_receive';`;

    // Suppliers
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;`;
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);`;
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0;`;
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2) DEFAULT 0;`;
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance_type VARCHAR(20) DEFAULT 'to_pay';`;

    // Shops
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_column_definitions JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS allow_service_products BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(50) DEFAULT '';`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS invoice_suffix VARCHAR(50) DEFAULT '';`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS next_invoice_number INT DEFAULT 1;`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS invoice_padding INT DEFAULT 1;`;
    await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS allow_data_reset BOOLEAN DEFAULT false;`;

    // Products
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Pcs';`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'inclusive';`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;`;

    // Orders
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery TIMESTAMP;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50);`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_name VARCHAR(255);`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS lr_number VARCHAR(100);`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS lr_date VARCHAR(50);`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);`;

    // Order Items
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);`;
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;`;
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS custom_inputs JSONB DEFAULT '{}'::jsonb;`;

    logger.info('[database]: Connected to PostgreSQL & all missing columns/tables verified!');
  } catch (error) {
    logger.error('[database]: Failed to connect to PostgreSQL:', error);
  }
});

// Restart trigger for nodemon
