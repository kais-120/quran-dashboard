
const express = require('express');
const router = express.Router();

const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/ExpenseController');

const {
  validateId,
  validateExpense,
  validateExpenseQuery,
} = require('../validators/ExpenseValidator');

const validateRequest = require('../middleware/ValidateRequest');

router.get(
  '/',
  validateExpenseQuery,
  validateRequest,
  getExpenses
);

router.post(
  '/',
  validateExpense,
  validateRequest,
  createExpense
);

router.put(
  '/:id',
  validateId,
  validateExpense,
  validateRequest,
  updateExpense
);

router.delete(
  '/:id',
  validateId,
  validateRequest,
  deleteExpense
);

module.exports = router;
