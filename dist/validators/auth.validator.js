"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.registerUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10, 'Mobile number must be at least 10 digits'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.registerUserSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10),
    password: zod_1.z.string().min(4),
    business_id: zod_1.z.string().uuid().optional(),
    is_business_owner: zod_1.z.boolean().optional(),
    full_name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    shop_roles: zod_1.z.array(zod_1.z.object({
        shop_id: zod_1.z.string().uuid(),
        role_id: zod_1.z.string().uuid()
    })).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10).optional(),
    password: zod_1.z.string().min(4).optional(),
    is_active: zod_1.z.boolean().optional(),
    full_name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
});
