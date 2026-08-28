import { Router } from 'express';
import { createProduct, getProducts } from '../controllers/product.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
router.use(protect);

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
router.post('/', createProduct);

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
router.get('/', getProducts);

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
import { getProductByBarcode, updateProduct, deleteProduct } from '../controllers/product.controller';
router.get('/barcode/:barcode', getProductByBarcode);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
