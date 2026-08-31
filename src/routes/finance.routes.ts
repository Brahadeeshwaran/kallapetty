import { Router } from 'express';
import { createPayment, createExpense, getPaymentsAndExpenses } from '../controllers/finance.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Finance
 *   description: Payments (Pazhaya Baaki) & Expenses (Kallapetti)
 */

/**
 * @swagger
 * /api/finance/payments:
 *   post:
 *     summary: Receive payment from a customer outside an order
 *     tags: [Finance]
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
 *               - customer_id
 *               - amount
 *               - received_via
 *             properties:
 *               shop_id:
 *                 type: string
 *               customer_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               received_via:
 *                 type: string
 *                 enum: [Cash, UPI]
 *     responses:
 *       201:
 *         description: Payment recorded
 */
router.post('/payments', createPayment);

/**
 * @swagger
 * /api/finance/expenses:
 *   post:
 *     summary: Record petty cash expense
 *     tags: [Finance]
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
 *               - amount
 *               - reason
 *             properties:
 *               shop_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Expense recorded
 */
router.post('/expenses', createExpense);

/**
 * @swagger
 * /api/finance:
 *   get:
 *     summary: Get daily payments and expenses for tallying Kallapetti
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data for Kallapetti tally
 */
router.get('/', getPaymentsAndExpenses);

export default router;
