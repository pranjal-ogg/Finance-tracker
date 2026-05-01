const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const transactionController = require('../controllers/transactionController');

// All transaction routes are protected
router.use(authMiddleware);

// Middleware to wrap multer, cleanly catching any file rejection/size errors with a 400
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('receipt');
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// @route   GET /api/transactions
router.get('/', transactionController.getTransactions);

// @route   POST /api/transactions
// Using handleUpload to intercept optional files before parsing checks
router.post(
  '/',
  handleUpload,
  [
    check('amount', 'Amount is required and must be numeric').isNumeric(),
    check('date', 'Date is required (YYYY-MM-DD)').not().isEmpty()
  ],
  transactionController.createTransaction
);

// @route   PUT /api/transactions/:id
router.put('/:id', handleUpload, transactionController.updateTransaction);

// @route   DELETE /api/transactions/:id
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
