"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const access_1 = require("../utils/access");
const errorHandler = (err, req, res, next) => {
    console.error('[Error]:', err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: err.issues,
        });
    }
    if (err instanceof access_1.HttpError) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    // Generic error fallback
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
    });
};
exports.errorHandler = errorHandler;
