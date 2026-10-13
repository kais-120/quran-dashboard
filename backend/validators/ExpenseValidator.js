
const { body, param, query } = require('express-validator');

const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid expense ID.'),
];

const validateExpense = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Expense title is required.')
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage('Title must contain 2 to 150 characters.'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required.')
    .bail()
    .isDecimal({ decimal_digits: '0,3' })
    .withMessage('Amount must be a valid decimal with up to 3 decimal places.')
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage('Amount must be greater than zero.'),

  body('date')
    .notEmpty()
    .withMessage('Date is required.')
    .bail()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Invalid date.'),

  body('note')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Note must be a string.')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Note must not exceed 255 characters.'),
];

const validateExpenseQuery = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string.'),

  query('month')
    .optional()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Month must use YYYY-MM format.'),
];

module.exports = {
  validateId,
  validateExpense,
  validateExpenseQuery,
};
