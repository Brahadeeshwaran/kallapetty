"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./models/db"));
const swagger_1 = require("./utils/swagger");
const errorHandler_1 = require("./middlewares/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
const shop_routes_1 = __importDefault(require("./routes/shop.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || allowedOrigins.length === 0)) {
    throw new Error('JWT_SECRET and CORS_ORIGIN must be configured in production');
}
app.set('trust proxy', 1);
app.disable('etag'); // Prevent 304 Not Modified responses
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin))
            return callback(null, true);
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Setup Swagger UI
(0, swagger_1.setupSwagger)(app);
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/businesses', business_routes_1.default);
app.use('/api/shops', shop_routes_1.default);
app.use('/api/customers', customer_routes_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/orders', order_routes_1.default);
app.use('/api/finance', finance_routes_1.default);
app.use('/api/roles', role_routes_1.default);
app.use('/api/suppliers', supplier_routes_1.default);
app.use('/api/purchases', purchase_routes_1.default);
// Basic health check route
app.get('/', async (req, res) => {
    try {
        // Simple query to verify DB connection is active
        await (0, db_1.default) `SELECT 1`;
        res.json({ message: 'Server is running and Database is connected successfully!' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server running but DB connection failed.' });
    }
});
// Global Error Handler (must be after all routes)
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(port, async () => {
    logger_1.logger.info(`[server]: Server is running at port ${port}`);
    try {
        await (0, db_1.default) `SELECT 1`;
        logger_1.logger.info('[database]: Connected to PostgreSQL successfully!');
    }
    catch (error) {
        logger_1.logger.error('[database]: Failed to connect to PostgreSQL:', error);
    }
});
// Restart trigger for nodemon
