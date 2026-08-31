"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User Management API
 */
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Staff or Owner)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - business_id
 *               - name
 *               - password
 *               - role
 *             properties:
 *               business_id:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, staff]
 *     responses:
 *       201:
 *         description: User created
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware_1.requireBusinessOwner, user_controller_1.createUser);
router.get('/', authMiddleware_1.requireBusinessOwner, user_controller_1.getUsers);
router.put('/:id', authMiddleware_1.requireBusinessOwner, user_controller_1.updateUser);
router.post('/:id/shops', authMiddleware_1.requireBusinessOwner, user_controller_1.assignShopToUser);
router.put('/:id/shops', authMiddleware_1.requireBusinessOwner, user_controller_1.updateStaffShops);
exports.default = router;
