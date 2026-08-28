import { Router } from 'express';
import { createShop, getShops, updateShop, markShopPaid } from '../controllers/shop.controller';
import { protect, requireBusinessOwner, superadminOnly } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: Shop Management
 */

/**
 * @swagger
 * /api/shops:
 *   post:
 *     summary: Create a new physical shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shop created
 * 
 *   get:
 *     summary: List accessible shops for the user
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shops
 */
router.post('/', requireBusinessOwner, createShop);
router.get('/', getShops);
router.put('/:id', requireBusinessOwner, updateShop);
router.post('/:id/pay', superadminOnly, markShopPaid);

export default router;
