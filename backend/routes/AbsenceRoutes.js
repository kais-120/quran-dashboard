
const express = require("express");
const router = express.Router();

const {
  getAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
} = require("../controllers/AbsenceController");

const {
  getAbsencesValidator,
  absenceIdValidator,
  createAbsenceValidator,
  updateAbsenceValidator,
} = require("../validators/AbsenceValidator");

router
  .route("/")
  .get(getAbsencesValidator, getAbsences)
  .post(createAbsenceValidator, createAbsence);

router
  .route("/:id")
  .put(updateAbsenceValidator, updateAbsence)
  .delete(absenceIdValidator, deleteAbsence);

module.exports = router;
