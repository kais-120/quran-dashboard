
const { body, param, query } = require("express-validator");

const teacherPaymentValidator = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .bail()
    .isDecimal({ decimal_digits: "0,3" })
    .withMessage("Amount must be a valid decimal")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("Amount must be greater than 0"),

  body("date_payment")
    .optional()
    .isISO8601()
    .withMessage("Payment date must be valid"),

  body("teacher_id")
    .notEmpty()
    .withMessage("Teacher ID is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Teacher ID must be a positive integer"),
];

const listTeacherPaymentsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("teacher_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Teacher ID must be a positive integer"),

  query("year")
    .optional()
    .matches(/^\d{4}$/)
    .withMessage("Year must contain exactly 4 digits"),

  query("month")
    .optional()
    .matches(/^(0[1-9]|1[0-2])$/)
    .withMessage("Month must be between 01 and 12"),
];

module.exports = {
  teacherPaymentValidator,
  listTeacherPaymentsValidator
};
