
const { body, param, query } = require("express-validator");

exports.getAbsencesValidator = [
  query("date")
    .optional({ checkFalsy: true })
    .isISO8601({ strict: true })
    .withMessage("تاريخ غير صالح"),

  query("q")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("عبارة البحث طويلة جدًا"),
];

exports.absenceIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("معرّف الغياب غير صالح"),
];

exports.createAbsenceValidator = [
  body("student_id")
    .notEmpty()
    .withMessage("الطالب مطلوب")
    .bail()
    .isInt({ min: 1 })
    .withMessage("معرّف الطالب غير صالح"),

  body("date")
    .notEmpty()
    .withMessage("تاريخ الغياب مطلوب")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("تاريخ غير صالح"),

  body("justified")
    .optional()
    .isBoolean()
    .withMessage("حالة التبرير غير صالحة"),

  body("reason")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("السبب يجب ألا يتجاوز 255 حرفًا"),
];

exports.updateAbsenceValidator = [
  ...exports.absenceIdValidator,

  body("student_id")
    .notEmpty()
    .withMessage("الطالب مطلوب")
    .bail()
    .isInt({ min: 1 })
    .withMessage("معرّف الطالب غير صالح"),

  body("date")
    .notEmpty()
    .withMessage("تاريخ الغياب مطلوب")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("تاريخ غير صالح"),

  body("justified")
    .exists()
    .withMessage("حالة التبرير مطلوبة")
    .bail()
    .isBoolean()
    .withMessage("حالة التبرير غير صالحة"),

  body("reason")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("السبب يجب ألا يتجاوز 255 حرفًا"),
];
