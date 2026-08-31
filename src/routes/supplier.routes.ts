import { Router } from 'express';
import { createSupplier, getSuppliers, updateSupplier, addSupplierPayment } from '../controllers/supplier.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.put('/:id', updateSupplier);
router.post('/:id/payments', addSupplierPayment);

export default router;
