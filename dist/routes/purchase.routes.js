"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_controller_1 = require("../controllers/purchase.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// Purchase Orders
router.post('/orders', purchase_controller_1.createPurchaseOrder);
router.get('/orders', purchase_controller_1.getPurchaseOrders);
router.post('/orders/:id/receive', purchase_controller_1.receivePurchaseOrder);
// Direct Invoices (if needed)
router.post('/', purchase_controller_1.createPurchaseInvoice);
router.get('/', purchase_controller_1.getPurchaseInvoices);
exports.default = router;
