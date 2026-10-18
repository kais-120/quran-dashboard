const express = require("express");
const router = express.Router();

const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/TeacherController");

const {
  createValidator,
  updateValidator,
} = require("../validators/TeacherValidator");

router.get("/", getTeachers);
router.get("/:id", getTeacherById);
router.post("/", createValidator, createTeacher);
router.put("/:id", updateValidator, updateTeacher);
router.delete("/:id", deleteTeacher);

module.exports = router;