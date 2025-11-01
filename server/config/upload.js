const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLD_CLOUD,
  api_key: process.env.CLD_KEY,
  api_secret: process.env.CLD_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { upload, cloudinary };