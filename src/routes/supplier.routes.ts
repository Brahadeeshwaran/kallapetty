import { Router } from 'express';
import { createSupplier, getSuppliers } from '../controllers/supplier.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createSupplier);
router.get('/', getSuppliers);

export default router;
