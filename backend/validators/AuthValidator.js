const { body } = require("express-validator");

exports.updateValidator = [
    body("name").trim().notEmpty().withMessage("name required"),
    body("username")
      .optional({ checkFalsy: true })
]