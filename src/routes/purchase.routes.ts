import { Router } from 'express';
import { createPurchaseInvoice, getPurchaseInvoices, createPurchaseOrder, getPurchaseOrders, receivePurchaseOrder, updatePurchaseOrder, payPurchaseOrder } from '../controllers/purchase.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

// Purchase Orders
router.post('/orders', createPurchaseOrder);
router.get('/orders', getPurchaseOrders);
router.put('/orders/:id', updatePurchaseOrder);
router.post('/orders/:id/receive', receivePurchaseOrder);
router.post('/orders/:id/pay', payPurchaseOrder);

// Direct Invoices (if needed)
router.post('/', createPurchaseInvoice);
router.get('/', getPurchaseInvoices);

export default router;
