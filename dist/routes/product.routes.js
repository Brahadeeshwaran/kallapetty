"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product & Service Inventory
 */
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product or service
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shop_id
 *               - name
 *               - price
 *               - stock
 *             properties:
 *               shop_id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               is_service:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', product_controller_1.createProduct);
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products (optionally filtered by shop_id)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *         required: false
 *         description: UUID of the shop
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         required: false
 *         description: Barcode string
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', product_controller_1.getProducts);
/**
 * @swagger
 * /api/products/barcode/{barcode}:
 *   get:
 *     summary: Get a single product by its barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         schema:
 *           type: string
 *         required: true
 *         description: The barcode string of the product
 *     responses:
 *       200:
 *         description: The product details
 *       404:
 *         description: Product not found
 */
router.get('/barcode/:barcode', product_controller_1.getProductByBarcode);
router.get('/:id/stock-logs', product_controller_1.getProductStockLogs);
router.put('/:id', product_controller_1.updateProduct);
router.delete('/:id', product_controller_1.deleteProduct);
exports.default = router;
