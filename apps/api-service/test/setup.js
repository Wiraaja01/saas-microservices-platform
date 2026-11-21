// Dijalankan sekali sebelum setiap file test.
//
// Kenapa perlu? Beberapa modul membaca process.env saat pertama kali
// di-require (contoh: JWT_SECRET di src/middleware/auth.js dan
// src/routes/auth.routes.js). Jadi env harus diset DULU, sebelum test
// memanggil require('../src/index').

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

// src/index.js punya request logger (console.log) dan beberapa route
// memanggil console.error saat error. Disenyapkan supaya output test bersih.
let logSpy;
let errorSpy;

beforeAll(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});
