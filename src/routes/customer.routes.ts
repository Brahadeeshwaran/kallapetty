import { Router } from 'express';
import { createCustomer, getCustomers, getCustomerPrices } from '../controllers/customer.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer Management
 */

router.get('/:id/prices', getCustomerPrices);

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
router.post('/', createCustomer);

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
router.get('/', getCustomers);

export default router;
