
const { body, param, validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

const validateId = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Course ID must be a positive integer."),
  validateRequest,
];

const validateCourse = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Course name is required.")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Course name must be between 2 and 150 characters."),

  body("start_date")
    .notEmpty()
    .withMessage("Start date is required.")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Start date must be a valid date in YYYY-MM-DD format."),

  body("end_date")
    .notEmpty()
    .withMessage("End date is required.")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("End date must be a valid date in YYYY-MM-DD format.")
    .bail()
    .custom((endDate, { req }) => {
      if (
        req.body.start_date &&
        /^\d{4}-\d{2}-\d{2}$/.test(req.body.start_date) &&
        endDate < req.body.start_date
      ) {
        throw new Error(
          "End date must be on or after the start date."
        );
      }

      return true;
    }),

  body("student_ids")
    .optional()
    .isArray()
    .withMessage("Student IDs must be an array."),

  body("student_ids.*")
    .if(body("student_ids").isArray())
    .isInt({ min: 1 })
    .withMessage("Each student ID must be a positive integer."),

  body("student_ids")
    .if(body("student_ids").isArray())
    .custom((ids) => {
      if (new Set(ids.map(String)).size !== ids.length) {
        throw new Error("Duplicate student IDs are not allowed.");
      }
      return true;
    }),

  validateRequest,
];

const validateCourseUpdate = [
  body("name")
    .optional()
    .isString()
    .withMessage("Course name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Course name cannot be empty.")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Course name must be between 2 and 150 characters."),

  body("start_date")
    .optional()
    .isISO8601({ strict: true })
    .withMessage("Start date must be a valid date in YYYY-MM-DD format."),

  body("end_date")
    .optional()
    .isISO8601({ strict: true })
    .withMessage("End date must be a valid date in YYYY-MM-DD format."),

  body("student_ids")
    .optional()
    .isArray()
    .withMessage("Student IDs must be an array."),

  body("student_ids.*")
    .if(body("student_ids").isArray())
    .isInt({ min: 1 })
    .withMessage("Each student ID must be a positive integer."),

  body("student_ids")
    .if(body("student_ids").isArray())
    .custom((ids) => {
      if (new Set(ids.map(String)).size !== ids.length) {
        throw new Error("Duplicate student IDs are not allowed.");
      }
      return true;
    }),

  // Validate the combined dates, including unchanged dates from the DB,
  // in the controller before updating.
  validateRequest,
];

module.exports = {
  validateId,
  validateCourse,
  validateCourseUpdate,
};
