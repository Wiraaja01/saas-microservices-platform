// Unit test untuk src/middleware/auth.js
//
// Middleware ini yang melindungi /api/keys dan /api/analytics.
// Kalau ada bug di sini, endpoint privat bisa diakses tanpa login.

const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middleware/auth');

const SECRET = process.env.JWT_SECRET;

// Objek response tiruan. `status()` harus mengembalikan `res` sendiri
// supaya bisa dirangkai: res.status(401).json({...})
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware auth', () => {
  it('401 kalau header Authorization tidak ada', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing or invalid Authorization header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('401 kalau skemanya bukan Bearer', () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 kalau token tidak valid / bukan JWT', () => {
    const req = { headers: { authorization: 'Bearer token-ngawur' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401 kalau token sudah kedaluwarsa', () => {
    // expiresIn negatif = token dibuat sudah lewat masa berlaku
    const token = jwt.sign({ userId: 'user-1' }, SECRET, { expiresIn: -10 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('token dari secret lain harus ditolak', () => {
    const token = jwt.sign({ userId: 'user-1' }, 'secret-yang-salah');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('meloloskan request dan mengisi req.userId kalau token valid', () => {
    const token = jwt.sign({ userId: 'user-123' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('user-123');
    expect(res.status).not.toHaveBeenCalled();
  });
});
