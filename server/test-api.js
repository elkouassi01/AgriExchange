// test-api.js
process.env.DATABASE_PROVIDER = 'postgres';
const { getProducts } = require('./controllers/productController');

const mockReq = { query: {} };
const mockRes = {
  status(code) {
    console.log('Status:', code);
    return {
      json(data) {
        console.log('Response:', JSON.stringify(data, null, 2));
        process.exit(0);
      }
    };
  }
};

getProducts(mockReq, mockRes);