const { body } = require("express-validator");

exports.updateValidator = [
  body("association_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Association name cannot be empty."),

  body("school_year")
    .optional()
    .trim()
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage("School year must be in YYYY/YYYY format."),

  body("default_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Default fee must be a non-negative number.")
    .toFloat(),

  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone number cannot exceed 20 characters."),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address cannot exceed 255 characters."),
];