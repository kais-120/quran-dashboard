
const { body, param, query } = require("express-validator");

const createUserValidator = [
  body("full_name")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Full name must be between 2 and 255 characters"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must contain at least 8 characters"),

  body("role")
    .optional()
    .isIn(["supervisor", "admin"])
    .withMessage("Role must be supervisor or admin"),
];

const updateUserValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid user ID"),

  body("full_name")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Full name must be between 2 and 255 characters"),

  body("username")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username cannot be empty")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),

  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must contain at least 8 characters"),

  body("role")
    .optional()
    .isIn(["supervisor", "admin"])
    .withMessage("Role must be supervisor or admin"),
];

const getUserValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid user ID"),
];


const deleteUserValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid user ID"),
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  getUserValidator,
  deleteUserValidator,
};
