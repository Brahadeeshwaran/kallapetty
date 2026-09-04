import { Router } from 'express';
import { createSupplier, getSuppliers, updateSupplier, addSupplierPayment, getSupplierPrices } from '../controllers/supplier.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.get('/:id/prices', getSupplierPrices);
router.put('/:id', updateSupplier);
router.post('/:id/payments', addSupplierPayment);

export default router;
