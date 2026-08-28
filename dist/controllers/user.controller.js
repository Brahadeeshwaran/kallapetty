"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.updateStaffShops = exports.assignShopToUser = exports.getUsers = exports.createUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../models/db"));
const auth_validator_1 = require("../validators/auth.validator");
const createUser = async (req, res, next) => {
    try {
        const data = auth_validator_1.registerUserSchema.parse(req.body);
        // Infer business_id if not provided (for owners creating staff)
        const targetBusinessId = data.business_id || req.user?.business_id;
        if (!targetBusinessId) {
            return res.status(400).json({ status: 'error', message: 'Business ID is required' });
        }
        // Ensure non-superadmins don't create users for other businesses
        if (!req.user?.is_superadmin && req.user?.business_id !== targetBusinessId) {
            return res.status(403).json({ status: 'error', message: 'Cannot create staff for another business' });
        }
        const existings = await (0, db_1.default) `SELECT * FROM users WHERE phone = ${data.phone}`;
        const existingUser = existings[0];
        if (existingUser) {
            return res.status(400).json({ status: 'error', message: 'Mobile number already registered' });
        }
        const pass_hash = await bcrypt_1.default.hash(data.password, 10);
        const created_by = req.user?.id || null;
        const user = await db_1.default.begin(async (tx) => {
            const users = await tx `
        INSERT INTO users ${tx({
                phone: data.phone,
                business_id: targetBusinessId,
                pass_hash,
                is_superadmin: false,
                is_business_owner: data.is_business_owner || false,
                created_by,
                full_name: data.full_name || null,
                email: data.email || null,
            })}
        RETURNING *
      `;
            const u = users[0];
            let user_shops = [];
            if (data.shop_roles && data.shop_roles.length > 0) {
                for (const sr of data.shop_roles) {
                    const u_s = await tx `
            INSERT INTO user_shops ${tx({
                        user_id: u.id,
                        shop_id: sr.shop_id,
                        role_id: sr.role_id,
                        created_by,
                    })}
            RETURNING *
          `;
                    user_shops.push(u_s[0]);
                }
            }
            return { ...u, user_shops };
        });
        res.status(201).json({
            status: 'success',
            data: {
                id: user.id,
                phone: user.phone,
                user_shops: user.user_shops,
                business_id: user.business_id,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const getUsers = async (req, res, next) => {
    try {
        let users;
        if (req.user?.is_superadmin) {
            users = await (0, db_1.default) `
        SELECT u.*,
               (
                  SELECT json_agg(json_build_object(
                    'id', us.id,
                    'user_id', us.user_id,
                    'shop_id', us.shop_id,
                    'role_id', us.role_id,
                    'shop', json_build_object('name', s.name),
                    'role', json_build_object('name', r.name)
                  ))
                  FROM user_shops us
                  JOIN shops s ON s.id = us.shop_id
                  JOIN roles r ON r.id = us.role_id
                  WHERE us.user_id = u.id
               ) as user_shops
        FROM users u
      `;
        }
        else {
            users = await (0, db_1.default) `
        SELECT u.*,
               (
                  SELECT json_agg(json_build_object(
                    'id', us.id,
                    'user_id', us.user_id,
                    'shop_id', us.shop_id,
                    'role_id', us.role_id,
                    'shop', json_build_object('name', s.name),
                    'role', json_build_object('name', r.name)
                  ))
                  FROM user_shops us
                  JOIN shops s ON s.id = us.shop_id
                  JOIN roles r ON r.id = us.role_id
                  WHERE us.user_id = u.id
               ) as user_shops
        FROM users u
        WHERE u.business_id = ${req.user?.business_id}
      `;
        }
        const formatted = users.map(u => ({
            ...u,
            user_shops: u.user_shops || []
        }));
        res.json({ status: 'success', data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const assignShopToUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { shop_id } = req.body;
        if (!req.user?.is_superadmin) {
            const targetUsers = await (0, db_1.default) `SELECT * FROM users WHERE id = ${id}`;
            const targetUser = targetUsers[0];
            if (targetUser?.business_id !== req.user?.business_id)
                return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
        const created_by = req.user?.id || null;
        const userShops = await (0, db_1.default) `
      INSERT INTO user_shops ${(0, db_1.default)({ user_id: id, shop_id, role_id: req.body.role_id, created_by })}
      RETURNING *
    `;
        res.status(201).json({ status: 'success', data: userShops[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.assignShopToUser = assignShopToUser;
const updateStaffShops = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { shop_roles } = req.body; // Expecting { shop_id: string, role_id: string }[]
        if (!req.user?.is_superadmin) {
            const targetUsers = await (0, db_1.default) `SELECT * FROM users WHERE id = ${id}`;
            const targetUser = targetUsers[0];
            if (targetUser?.business_id !== req.user?.business_id)
                return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
        const requestedMap = new Map();
        (shop_roles || []).forEach((sr) => requestedMap.set(sr.shop_id, sr.role_id));
        const requestedShopIds = Array.from(requestedMap.keys());
        const existing = await (0, db_1.default) `SELECT * FROM user_shops WHERE user_id = ${id}`;
        const existingShopIds = existing.map(e => e.shop_id);
        const toDelete = existingShopIds.filter(sId => !requestedShopIds.includes(sId));
        const toCreateOrUpdate = requestedShopIds;
        const created_by = req.user?.id || null;
        await db_1.default.begin(async (tx) => {
            if (toDelete.length > 0) {
                await tx `DELETE FROM user_shops WHERE user_id = ${id} AND shop_id IN ${tx(toDelete)}`;
            }
            for (const shop_id of toCreateOrUpdate) {
                const role_id = requestedMap.get(shop_id);
                await tx `
          INSERT INTO user_shops ${tx({
                    user_id: id,
                    shop_id,
                    role_id,
                    created_by,
                })}
          ON CONFLICT (user_id, shop_id) 
          DO UPDATE SET role_id = EXCLUDED.role_id
        `;
            }
        });
        res.json({ status: 'success', message: 'Shops updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateStaffShops = updateStaffShops;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = require('../validators/auth.validator').updateUserSchema.parse(req.body);
        if (!req.user?.is_superadmin) {
            const existings = await (0, db_1.default) `SELECT * FROM users WHERE id = ${id}`;
            const existing = existings[0];
            if (existing?.business_id !== req.user?.business_id)
                return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
        const updateData = { ...data };
        if (data.password)
            updateData.pass_hash = await bcrypt_1.default.hash(data.password, 10);
        delete updateData.password;
        const users = await (0, db_1.default) `
      UPDATE users SET ${(0, db_1.default)(updateData)}
      WHERE id = ${id} RETURNING *
    `;
        const user = users[0];
        res.json({ status: 'success', data: { id: user.id, phone: user.phone } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
