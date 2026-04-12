    const express = require('express');
    const { body } = require('express-validator');
    const {
    getPassengers,
    getPassenger,
    createPassenger,
    updatePassenger,
    checkInPassenger,
    deletePassenger,
    } = require('../controllers/passengerController');
    const { protect } = require('../middleware/auth');
    const authorize = require('../middleware/authorize');
    const validate = require('../middleware/validate');

    const router = express.Router();

    // All routes require authentication
    router.use(protect);

    const passengerValidation = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('passportNumber').trim().notEmpty().withMessage('Passport number is required'),
    body('flight').notEmpty().withMessage('Flight ID is required'),
    ];

    // GET all passengers — admin, staff, viewer
    // POST add passenger — admin, staff only
    router.route('/')
    .get(authorize('admin', 'staff', 'viewer'), getPassengers)
    .post(authorize('admin', 'staff'), passengerValidation, validate, createPassenger);

    // GET single passenger — admin, staff, viewer
    // PUT update passenger — admin, staff only
    // DELETE passenger — admin only
    router.route('/:id')
    .get(authorize('admin', 'staff', 'viewer'), getPassenger)
    .put(authorize('admin', 'staff'), updatePassenger)
    .delete(authorize('admin'), deletePassenger);

    // PATCH check-in — admin, staff only
    router.patch('/:id/checkin', authorize('admin', 'staff'), checkInPassenger);

    module.exports = router;