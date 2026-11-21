// Konfigurasi Jest untuk api-service.
// Dijalankan otomatis oleh `npm test` (lihat scripts di package.json).
module.exports = {
  testEnvironment: 'node',

  // File yang dijalankan SEBELUM tiap file test (isi env var + senyapkan log).
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Hanya file *.test.js di folder test/ yang dianggap test.
  // File bantu seperti test/helpers/prismaMock.js tidak ikut dijalankan.
  testMatch: ['<rootDir>/test/**/*.test.js'],

  // Bersihkan catatan pemanggilan mock sebelum tiap test,
  // supaya hasil test tidak saling mempengaruhi.
  clearMocks: true,

  // Coverage dihitung dari source asli, kecuali folder config
  // (prisma & redis selalu di-mock, jadi angka 0% di sana menyesatkan).
  collectCoverageFrom: ['src/**/*.js', '!src/config/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
