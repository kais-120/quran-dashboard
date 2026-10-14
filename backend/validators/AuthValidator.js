const { body } = require("express-validator");

exports.updateValidator = [
    body("username").trim().notEmpty().withMessage("username required")
]