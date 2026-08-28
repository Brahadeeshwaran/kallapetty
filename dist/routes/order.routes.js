"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Billing and Order Management
 */
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new bill (Order)
 *     tags: [Orders]
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
 *               - total_amount
 *               - amount_paid
 *               - status
 *               - items
 *             properties:
 *               shop_id:
 *                 type: string
 *               customer_id:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               discount_amount:
 *                 type: number
 *               amount_paid:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [paid, partial, unpaid]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                     qty:
 *                       type: number
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', order_controller_1.createOrder);
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', order_controller_1.getOrders);
/**
 * @swagger
 * /api/orders/{id}/mark-paid:
 *   put:
 *     summary: Mark an order as fully paid
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order marked as paid
 */
router.put('/:id/mark-paid', order_controller_1.markOrderPaid);
router.put('/:id/delivery-status', order_controller_1.updateDeliveryStatus);
exports.default = router;
