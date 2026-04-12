const express    = require('express');
const { body }   = require('express-validator');
const rateLimit  = require('express-rate-limit');
const { setup, register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate   = require('../middleware/validate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many attempts. Try in 15 min.' },
  standardHeaders: true, legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many registrations from this IP.' },
  standardHeaders: true, legacyHeaders: false,
});

router.post('/setup',
  [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(),
   body('password').isLength({ min: 6 })], validate, setup);

router.post('/login', loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], validate, login);

// role field intentionally absent — server always assigns 'staff'
router.post('/register', registerLimiter,
  [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(),
   body('password').isLength({ min: 6 })], validate, register);

router.get('/me', protect, getMe);

module.exports = router;
