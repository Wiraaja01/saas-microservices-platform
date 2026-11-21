// Test endpoint autentikasi: register, login, dan /me.
//
// Semua akses database di-mock, jadi test ini cepat dan tidak butuh PostgreSQL.

jest.mock('../src/config/prisma', () => require('./helpers/prismaMock').createPrismaMock());
jest.mock('../src/config/redis', () => ({ set: jest.fn(), get: jest.fn(), on: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../src/index');
const prisma = require('../src/config/prisma');

const SECRET = process.env.JWT_SECRET;
const authHeader = (userId = 'user-1') => `Bearer ${jwt.sign({ userId }, SECRET)}`;

describe('POST /api/auth/register', () => {
  it('400 kalau email atau password tidak dikirim', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });

  it('400 kalau password kurang dari 8 karakter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Password must be at least 8 characters' });
  });

  it('409 kalau email sudah terdaftar', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-lama', email: 'a@b.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'rahasia123' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Email already registered' });
    // tidak boleh lanjut membuat user baru
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('201 dan password disimpan sebagai hash, bukan teks asli', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'user-baru',
      email: data.email,
      name: data.name,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'baru@example.com', password: 'rahasia123', name: 'Budi' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.user).toMatchObject({
      id: 'user-baru',
      email: 'baru@example.com',
      name: 'Budi',
    });
    // response tidak boleh membocorkan password
    expect(res.body.user).not.toHaveProperty('password');

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.password).not.toBe('rahasia123');
    expect(data.password).toMatch(/^\$2[aby]\$/); // format hash bcrypt
    await expect(bcrypt.compare('rahasia123', data.password)).resolves.toBe(true);
  });

  it('500 kalau database error', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'rahasia123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/auth/login', () => {
  it('400 kalau email atau password tidak dikirim', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });

  it('401 kalau user tidak ditemukan', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tidak-ada@example.com', password: 'rahasia123' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('401 kalau password salah', async () => {
    const hash = await bcrypt.hash('password-benar', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Budi',
      password: hash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'password-salah' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(res.body.token).toBeUndefined();
  });

  it('200 + token JWT yang valid kalau kredensial benar', async () => {
    const hash = await bcrypt.hash('password-benar', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Budi',
      password: hash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'password-benar' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.user).toEqual({ id: 'user-1', email: 'a@b.com', name: 'Budi' });

    // token harus benar-benar bisa diverifikasi dengan secret yang sama
    const decoded = jwt.verify(res.body.token, SECRET);
    expect(decoded.userId).toBe('user-1');
  });

  it('500 kalau database error', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'rahasia123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('GET /api/auth/me', () => {
  it('401 kalau tanpa token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid Authorization header' });
  });

  it('404 kalau user di token sudah tidak ada di database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('200 dan mengembalikan profil user yang sedang login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Budi',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'user-1', email: 'a@b.com', name: 'Budi' });

    // pastikan query memakai userId dari token, bukan dari input user
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } })
    );
  });

  it('500 kalau database error', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
