import { Router } from 'express';
import { createSupplier, getSuppliers, updateSupplier, addSupplierPayment, getSupplierPrices, exportSuppliers, importSuppliers, deleteSupplier } from '../controllers/supplier.controller';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(protect);

router.get('/export', exportSuppliers);
router.post('/import', upload.single('file'), importSuppliers);

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.get('/:id/prices', getSupplierPrices);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.post('/:id/payments', addSupplierPayment);

export default router;
