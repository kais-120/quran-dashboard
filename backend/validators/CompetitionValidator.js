const { body, query, validationResult } = require('express-validator');

const MAX_SCORE = 100;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

const getScoresRules = [
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('السنة غير صالحة').toInt(),
];

const saveScoresRules = [
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('السنة غير صالحة').toInt(),
  body('group_id').isInt({ min: 1 }).withMessage('الفوج مطلوب').toInt(),
  body('scores').isArray().withMessage('قائمة النقاط غير صالحة'),
  body('scores.*.student_id').isInt({ min: 1 }).withMessage('معرّف التلميذ غير صالح').toInt(),
  body('scores.*.score')
    .isFloat({ min: 0, max: MAX_SCORE })
    .withMessage(`النقطة يجب أن تكون بين 0 و ${MAX_SCORE}`)
    .toFloat(),
  body('scores').custom((scores) => {
    const ids = scores.map((s) => String(s.student_id));
    if (new Set(ids).size !== ids.length) {
      throw new Error('تلميذ مكرر في القائمة');
    }
    return true;
  }),
];

module.exports = {
  validate,
  getScoresRules,
  saveScoresRules,
};