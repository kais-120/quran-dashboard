const { body } = require("express-validator");

const validateStartDate = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (date > today) {
    throw new Error("Start date cannot be in the future.");
  }

  return true;
};

const phoneValidation = (field) =>
  body(field)
    .trim()
    .matches(/^\d{2} ?\d{3} ?\d{3}$/)
    .withMessage("Phone number must contain 8 digits.");

exports.createValidator = [
  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required."),

  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required."),

  body("start_date")
    .notEmpty()
    .withMessage("Start date is required.")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Start date is invalid.")
    .bail()
    .custom(validateStartDate),

  phoneValidation("phone"),
];

exports.updateValidator = [
  body("last_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty."),

  body("first_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty."),

  body("start_date")
    .optional()
    .notEmpty()
    .withMessage("Start date cannot be empty.")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Start date is invalid.")
    .bail()
    .custom(validateStartDate),

  body("phone")
    .optional()
    .trim()
    .matches(/^\d{2} ?\d{3} ?\d{3}$/)
    .withMessage("Phone number must contain 8 digits."),
];