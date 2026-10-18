const express = require("express");
const router = express.Router();

const {
  getStudentGroups,
  getStudentGroupsByStudent,
  createStudentGroup,
  updateStudentGroup,
  deleteStudentGroup,
  getGroupStudentsById,
} = require("../controllers/StudentGroupController");

router.get("/", getStudentGroups);
router.get("/student/:studentId", getStudentGroupsByStudent);
router.get("/group/:groupId", getGroupStudentsById);

router.post("/", createStudentGroup);
router.put("/", updateStudentGroup);
router.delete("/:id", deleteStudentGroup);

module.exports = router;