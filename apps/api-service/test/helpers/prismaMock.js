// Mock pengganti PrismaClient.
//
// Test TIDAK boleh menyentuh database sungguhan: lambat, butuh PostgreSQL,
// dan hasilnya tidak deterministik. Jadi semua method Prisma yang dipakai
// source diganti jest.fn() yang perilakunya diatur per test.
//
// Daftar method di bawah diambil dari pemakaian nyata di src/routes:
//   auth.routes.js      -> user.findUnique, user.create
//   keys.routes.js      -> apiKey.create, apiKey.findMany, apiKey.findFirst, apiKey.update
//   analytics.routes.js -> apiKey.findMany, requestLog.count, requestLog.findMany
//   index.js (/health)  -> $queryRaw
function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    requestLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  };
}

module.exports = { createPrismaMock };
