const { body } = require("express-validator");

exports.createValidator = [
  body("label")
    .trim()
    .notEmpty()
    .withMessage("Group label is required.")
    .isLength({ max: 100 })
    .withMessage("Group label cannot exceed 100 characters."),

  body("head_teacher_id")
    .optional({ values: "null" })
    .isInt({ min: 1 })
    .withMessage("Head teacher ID must be a positive integer."),
];

exports.updateValidator = [
  body("label")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Group label cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Group label cannot exceed 100 characters."),

  body("head_teacher_id")
    .optional({ values: "null" })
    .custom((value) => {
      if (value === null) return true;

      if (!/^\d+$/.test(String(value)) || BigInt(value) < 1n) {
        throw new Error("Head teacher ID must be a positive integer.");
      }

      return true;
    }),
];