const express = require('express');
const { protect } = require('../middleware/auth');
const { getLogs } = require('../controllers/logController');

const router = express.Router();

// GET /api/logs
router.get('/', protect, getLogs);

module.exports = router;
