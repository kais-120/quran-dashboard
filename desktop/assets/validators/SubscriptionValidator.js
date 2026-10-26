
const { body, param, query } = require("express-validator");


const updateSubscriptionValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid subscription ID"),

  body("student_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Invalid student ID"),

  body("school_year_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Invalid school year ID"),

  body("amount")
    .optional()
    .isDecimal({ decimal_digits: "0,3" })
    .withMessage("Amount must be a valid number with up to 3 decimal places")
    .custom((value) => {
      if (Number(value) <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      return true;
    }),

  body("date")
    .optional()
    .isISO8601({ strict: true })
    .withMessage("Date must be valid (YYYY-MM-DD)"),
];

const subscriptionIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid subscription ID"),
];

const listSubscriptionsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Student name must be between 1 and 100 characters"),

  query("year")
    .optional()
    .matches(/^\d{4}$/)
    .withMessage("Year must contain exactly 4 digits"),

  query("month")
    .optional()
    .matches(/^([1-9]|1[0-2])$/)
    .withMessage("Month must be between 01 and 12"),
];


const createSubscriptionPaymentValidator = [
  body("student_id")
    .notEmpty()
    .withMessage("Student ID is required")
    .isInt({ min: 1 })
    .withMessage("Student ID must be a positive integer"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a non-negative number"),
];
module.exports = {
  updateSubscriptionValidator,
  subscriptionIdValidator,
  listSubscriptionsValidator,
  createSubscriptionPaymentValidator
};
