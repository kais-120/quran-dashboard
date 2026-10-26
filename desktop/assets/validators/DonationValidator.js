
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
    .withMessage("Donation ID must be a positive integer."),
  validateRequest,
];

const validateDonation = [
  body("donor_type")
    .isIn(["person", "organization", "anonymous"])
    .withMessage("Invalid donor type."),

  body("donor_name")
    .custom((value, { req }) => {
      if (req.body.donor_type === "anonymous") return true;

      if (typeof value !== "string" || value.trim().length < 2) {
        throw new Error("Donor name must contain at least 2 characters.");
      }

      if (value.trim().length > 150) {
        throw new Error("Donor name must not exceed 150 characters.");
      }

      return true;
    }),

  body("donor_phone")
    .custom((value, { req }) => {
      if (req.body.donor_type === "anonymous") return true;

      if (value == null || value === "") return true;

      if (
        typeof value !== "string" ||
        !/^[0-9+ ]{8,15}$/.test(value)
      ) {
        throw new Error("Phone must contain 8 to 15 permitted characters.");
      }

      return true;
    }),

  body("kind")
    .isIn(["money", "in_kind"])
    .withMessage("Invalid donation kind."),

  body("amount")
    .custom((value, { req }) => {
      if (req.body.kind !== "money") return true;

      if (
        value === "" ||
        value == null ||
        !Number.isFinite(Number(value)) ||
        Number(value) <= 0
      ) {
        throw new Error("Amount must be greater than zero.");
      }

      return true;
    }),

  body("item")
    .custom((value, { req }) => {
      if (req.body.kind !== "in_kind") return true;

      if (typeof value !== "string" || value.trim().length < 2) {
        throw new Error("Item description must contain at least 2 characters.");
      }

      if (value.trim().length > 200) {
        throw new Error("Item description must not exceed 200 characters.");
      }

      return true;
    }),

  body("quantity")
    .custom((value, { req }) => {
      if (req.body.kind !== "in_kind") return true;
      if (value === "" || value == null) return true;

      if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
        throw new Error("Quantity must be a positive integer.");
      }

      return true;
    }),

  body("date")
    .isISO8601({ strict: true })
    .withMessage("Date must be a valid date in YYYY-MM-DD format.")
    .bail()
    .custom((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(`${value}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        throw new Error("Invalid calendar date.");
      }

      return true;
    }),

  body("note")
    .optional({ values: "null" })
    .isString()
    .withMessage("Note must be a string.")
    .bail()
    .isLength({ max: 255 })
    .withMessage("Note must not exceed 255 characters."),

  validateRequest,
];

module.exports = {
  validateId,
  validateDonation,
};
