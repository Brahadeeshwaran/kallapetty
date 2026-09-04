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
    await sql`
      CREATE TABLE IF NOT EXISTS customer_product_prices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        custom_price NUMERIC(10, 2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_customer_product UNIQUE (customer_id, product_id)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS supplier_product_prices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        last_purchase_price NUMERIC(10, 2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_supplier_product UNIQUE (supplier_id, product_id)
      );
    `;
    logger.info('[database]: Connected to PostgreSQL & custom pricing tables verified!');
  } catch (error) {
    logger.error('[database]: Failed to connect to PostgreSQL:', error);
  }
});

// Restart trigger for nodemon
