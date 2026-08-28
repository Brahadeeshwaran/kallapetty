"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuppliers = exports.createSupplier = void 0;
const db_1 = __importDefault(require("../models/db"));
const app_validator_1 = require("../validators/app.validator");
const createSupplier = async (req, res, next) => {
    try {
        const data = app_validator_1.createSupplierSchema.parse(req.body);
        const created_by = req.user?.id || null;
        const suppliers = await (0, db_1.default) `
      INSERT INTO suppliers ${(0, db_1.default)({
            ...data,
            business_id: req.user.business_id,
            created_by,
        })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: suppliers[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.createSupplier = createSupplier;
const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await (0, db_1.default) `
      SELECT * FROM suppliers
      WHERE business_id = ${req.user.business_id}
      ORDER BY created_at DESC
    `;
        res.json({ status: 'success', data: suppliers });
    }
    catch (error) {
        next(error);
    }
};
exports.getSuppliers = getSuppliers;
