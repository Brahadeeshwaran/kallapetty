"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shop_controller_1 = require("../controllers/shop.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
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
router.post('/', authMiddleware_1.requireBusinessOwner, shop_controller_1.createShop);
router.get('/', shop_controller_1.getShops);
router.put('/:id', authMiddleware_1.requireBusinessOwner, shop_controller_1.updateShop);
router.post('/:id/pay', authMiddleware_1.superadminOnly, shop_controller_1.markShopPaid);
exports.default = router;
