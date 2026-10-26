
const { body, param, query } = require("express-validator");

const validateDates = [
  body("start_date")
    .notEmpty()
    .withMessage("Start date is required")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Invalid start date"),

  body("end_date")
    .notEmpty()
    .withMessage("End date is required")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Invalid end date")
    .bail()
    .custom((endDate, { req }) => {
      const startDate = req.body.start_date;

      if (
        startDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
        endDate < startDate
      ) {
        throw new Error(
          "End date must be on or after the start date"
        );
      }

      return true;
    }),
];

exports.getActivitiesValidator = [
  query("q")
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Search query must not exceed 150 characters"),
];

exports.activityIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid activity ID"),
];

exports.createActivityValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Activity name is required")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Activity name must be between 2 and 150 characters"),

  ...validateDates,
];

exports.updateActivityValidator = [
  ...exports.activityIdValidator,

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Activity name is required")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Activity name must be between 2 and 150 characters"),

  ...validateDates,
];
