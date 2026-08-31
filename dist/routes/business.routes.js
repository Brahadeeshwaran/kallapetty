"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_controller_1 = require("../controllers/business.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Owner route
router.get('/me', authMiddleware_1.protect, business_controller_1.getMyBusiness);
router.put('/me', authMiddleware_1.protect, business_controller_1.updateMyBusiness);
// Superadmin routes
router.use(authMiddleware_1.protect, authMiddleware_1.superadminOnly);
/**
 * @swagger
 * tags:
 *   name: Businesses
 *   description: Superadmin Business Management
 */
/**
 * @swagger
 * /api/businesses/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 */
router.get('/stats', business_controller_1.getSystemStats);
/**
 * @swagger
 * /api/businesses:
 *   post:
 *     summary: Create a new tenant business
 *     tags: [Businesses]
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
 *               - owner_phone
 *             properties:
 *               name:
 *                 type: string
 *               owner_phone:
 *                 type: string
 *               subscription_end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Business created
 */
router.post('/', business_controller_1.createBusiness);
/**
 * @swagger
 * /api/businesses:
 *   get:
 *     summary: List all businesses
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of businesses
 */
router.get('/', business_controller_1.getBusinesses);
router.put('/:id', business_controller_1.updateBusiness);
exports.default = router;
