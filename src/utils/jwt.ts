import jwt from 'jsonwebtoken';

// Standard short-lived access token
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return process.env.JWT_SECRET;
};

export const generateToken = (payload: any) => {
  return jwt.sign({ ...payload, token_type: 'access' }, secret(), {
    expiresIn: '15m',
  });
};

// Long-lived refresh token
export const generateRefreshToken = (payload: any) => {
  return jwt.sign({ ...payload, token_type: 'refresh' }, secret(), {
    expiresIn: '7d',
  });
};

// Generic token verification
export const verifyToken = (token: string, tokenType: 'access' | 'refresh') => {
  const decoded = jwt.verify(token, secret()) as jwt.JwtPayload;
  if (decoded.token_type !== tokenType) throw new Error('Invalid token type');
  return decoded;
};
