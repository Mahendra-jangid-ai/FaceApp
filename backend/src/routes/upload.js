const express = require('express');
const multer = require('multer');
const { uploadDP, getDP } = require('../controllers/uploadController');

const router = express.Router();

// Memory storage — buffer directly sent to Cloudinary (no disk write)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/upload/dp/:userId  → upload DP
router.post('/dp/:userId', upload.single('photo'), uploadDP);

// GET  /api/upload/dp/:userId  → get DP URL
router.get('/dp/:userId', getDP);

module.exports = router;
