const express = require('express');
const { protect } = require('../middleware/auth');
const { getUsers } = require('../controllers/userController');

const router = express.Router();

// GET /api/users
router.get('/', protect, getUsers);

module.exports = router;
