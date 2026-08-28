import { Router } from 'express';
import { createUser, getUsers, updateUser, assignShopToUser, updateStaffShops } from '../controllers/user.controller';
import { protect, requireBusinessOwner } from '../middlewares/authMiddleware';

const router = Router();
router.use(protect);

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
router.post('/', requireBusinessOwner, createUser);
router.get('/', requireBusinessOwner, getUsers);
router.put('/:id', requireBusinessOwner, updateUser);
router.post('/:id/shops', requireBusinessOwner, assignShopToUser);
router.put('/:id/shops', requireBusinessOwner, updateStaffShops);

export default router;
