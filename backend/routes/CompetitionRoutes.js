const express = require('express');
const ctrl = require('../controllers/CompetitionController');
const {
  validate,
  getScoresRules,
  saveScoresRules,
} = require('../validators/CompetitionValidator');

const router = express.Router();

router.get('/', getScoresRules, validate, ctrl.getScores);
router.post('/scores', saveScoresRules, validate, ctrl.saveScores);

module.exports = router;