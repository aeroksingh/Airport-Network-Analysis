const express = require('express');
const { body } = require('express-validator');
const {
  getGates,
  getGate,
  createGate,
  updateGate,
  assignFlight,
  unassignFlight,
  deleteGate,
} = require('../controllers/gateController');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(protect);

const gateValidation = [
  body('gateNumber').trim().notEmpty().withMessage('Gate number is required'),
  body('terminal').trim().notEmpty().withMessage('Terminal is required'),
  body('status')
    .optional()
    .isIn(['Available', 'Occupied', 'Maintenance', 'Closed'])
    .withMessage('Invalid status'),
];

// GET all gates — admin, staff, viewer
// POST create gate — admin only
router.route('/')
  .get(authorize('admin', 'staff', 'viewer'), getGates)
  .post(authorize('admin'), gateValidation, validate, createGate);

// GET single gate — admin, staff, viewer
// PUT update gate — admin, staff only
// DELETE gate — admin only
router.route('/:id')
  .get(authorize('admin', 'staff', 'viewer'), getGate)
  .put(authorize('admin', 'staff'), updateGate)
  .delete(authorize('admin'), deleteGate);

// PATCH assign/unassign — admin, staff only
router.patch('/:id/assign', authorize('admin', 'staff'), assignFlight);
router.patch('/:id/unassign', authorize('admin', 'staff'), unassignFlight);

module.exports = router;