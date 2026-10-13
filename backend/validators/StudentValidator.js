const { body } = require("express-validator");

exports.StudentValidator = [
    body("name")
    .trim()
    .notEmpty()
    .withMessage("Student name is required."),

     body("group_id")
    .trim()
    .notEmpty()
    .withMessage("group id name is required."),

  body("father_name")
    .trim()
    .optional(),
  body("father_phone")
    .trim()
    .optional()
    .isMobilePhone("any")
    .withMessage("Father's phone number is invalid.")
    .withMessage("Father's phone number must be exactly 8 digits.")
    .matches(/^\d{8}$/)
    .withMessage("Father's phone number must contain only digits."),

  body("birthdate")
    .notEmpty()
    .withMessage("Birth date is required.")
    .isISO8601({ strict: true })
    .withMessage("Birth date is invalid.")
    .custom((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (date > today) {
        throw new Error("Birth date cannot be in the future.");
      }

      return true;
    }),
]
