const express = require('express');
const ctrl = require('../controllers/CompetitionController');
const {
  validate,
  getScoresRules,
  saveScoresRules,
  removeStrangerRules,
  addStrangerRules,
  
} = require('../validators/CompetitionValidator');

const router = express.Router();

router.get('/', getScoresRules, validate, ctrl.getScores);
router.post('/scores', saveScoresRules, validate, ctrl.saveScores);
router.post('/strangers', addStrangerRules, validate, ctrl.addStranger);
router.delete('/strangers/:id', removeStrangerRules, validate, ctrl.removeStranger);
router.get('/group', ctrl.getGroups);

module.exports = router;