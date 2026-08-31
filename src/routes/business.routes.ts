import { Router } from 'express';
import { createBusiness, getBusinesses, updateBusiness, getSystemStats, updateMyBusiness, getMyBusiness } from '../controllers/business.controller';
import { protect, superadminOnly } from '../middlewares/authMiddleware';

const router = Router();

// Owner route
router.get('/me', protect, getMyBusiness);
router.put('/me', protect, updateMyBusiness);

// Superadmin routes
router.use(protect, superadminOnly);

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
router.get('/stats', getSystemStats);

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
router.post('/', createBusiness);

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
router.get('/', getBusinesses);
router.put('/:id', updateBusiness);

export default router;
