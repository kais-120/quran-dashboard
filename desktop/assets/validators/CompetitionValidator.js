const { body, query, param, validationResult } = require("express-validator");

const yearMax = () => new Date().getFullYear() + 1;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

const getScoresRules = [
  query("year")
    .isInt({ min: 2026, max: yearMax() })
    .withMessage("سنة غير صالحة")
    .toInt(),
];

const saveScoresRules = [
  body("year")
    .isInt({ min: 2026, max: yearMax() })
    .withMessage("سنة غير صالحة")
    .toInt(),
  body("group_id").isInt({ min: 1 }).withMessage("الفوج مطلوب").toInt(),
  body("scores").isArray().withMessage("قائمة النقاط غير صالحة"),
  body("scores.*.student_group_id")
    .isInt({ min: 1 })
    .withMessage("عضو غير صالح"),
  body("scores.*.score")
    .isFloat({ min: 0, max: 100 })
    .withMessage("النقطة بين 0 و 100")
    .toFloat(),
];

const addStrangerRules = [
  body("group_id").isInt({ min: 1 }).withMessage("الفوج مطلوب").toInt(),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("الاسم مطلوب")
    .isLength({ max: 150 })
    .withMessage("الاسم طويل جدًا"),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }),
];

const removeStrangerRules = [
  param("id").isInt({ min: 1 }).withMessage("معرّف غير صالح").toInt(),
];

module.exports = {
  validate,
  getScoresRules,
  saveScoresRules,
  addStrangerRules,
  removeStrangerRules,
};