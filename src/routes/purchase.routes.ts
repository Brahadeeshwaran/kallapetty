import { Router } from 'express';
import { createPurchaseInvoice, getPurchaseInvoices, createPurchaseOrder, getPurchaseOrders, receivePurchaseOrder } from '../controllers/purchase.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

// Purchase Orders
router.post('/orders', createPurchaseOrder);
router.get('/orders', getPurchaseOrders);
router.post('/orders/:id/receive', receivePurchaseOrder);

// Direct Invoices (if needed)
router.post('/', createPurchaseInvoice);
router.get('/', getPurchaseInvoices);

export default router;
