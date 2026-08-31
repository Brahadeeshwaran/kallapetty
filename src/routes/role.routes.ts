import { Router } from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/role.controller';
import { protect, superadminOnly, requireBusinessOwner } from '../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.get('/', requireBusinessOwner, getRoles);
router.post('/', superadminOnly, createRole);
router.put('/:id', superadminOnly, updateRole);
router.delete('/:id', superadminOnly, deleteRole);

export default router;
