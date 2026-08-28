"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and set HttpOnly Refresh Cookie
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', auth_controller_1.login);
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Exchange Refresh Token (Cookie) for new Access Token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully refreshed token
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', auth_controller_1.refresh);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and clear Refresh Cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', auth_controller_1.logout);
exports.default = router;
