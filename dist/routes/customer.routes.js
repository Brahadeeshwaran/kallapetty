"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer Management
 */
/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer for the business
 *     tags: [Customers]
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
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post('/', customer_controller_1.createCustomer);
/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: List all customers for the business
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', customer_controller_1.getCustomers);
exports.default = router;
