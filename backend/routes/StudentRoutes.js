const express = require("express");
const router = express.Router();

const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsWithoutGroup,
  getStudentsNotPaidCurrentMonth,
} = require("../controllers/StudentController");
const { StudentValidator } = require("../validators/StudentValidator");

router.get("/", getStudents);
router.get("/without-group", getStudentsWithoutGroup);
router.get("/not-pay", getStudentsNotPaidCurrentMonth);
router.get("/:id", getStudentById);
router.post("/",StudentValidator, createStudent);
router.put("/:id",StudentValidator, updateStudent);
router.delete("/:id", deleteStudent);

module.exports = router;