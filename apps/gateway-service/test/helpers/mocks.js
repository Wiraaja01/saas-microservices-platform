function createRedisMock() {
  return {
    ping: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  };
}

function createRabbitMock() {
  return {
    connectRabbitMQ: jest.fn(),
    publishLog: jest.fn(),
  };
}

module.exports = { createRedisMock, createRabbitMock };
