"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Standard short-lived access token
const secret = () => {
    if (!process.env.JWT_SECRET)
        throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, token_type: 'access' }, secret(), {
        expiresIn: '15m',
    });
};
exports.generateToken = generateToken;
// Long-lived refresh token
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, token_type: 'refresh' }, secret(), {
        expiresIn: '7d',
    });
};
exports.generateRefreshToken = generateRefreshToken;
// Generic token verification
const verifyToken = (token, tokenType) => {
    const decoded = jsonwebtoken_1.default.verify(token, secret());
    if (decoded.token_type !== tokenType)
        throw new Error('Invalid token type');
    return decoded;
};
exports.verifyToken = verifyToken;
