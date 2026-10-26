
const express = require("express");
const router = express.Router();

const courseController = require("../controllers/CourseController");

const {
  validateId,
  validateCourse,
  validateCourseUpdate,
} = require("../validators/CourseValidator");

router.get("/", courseController.getCourses);

router.get(
  "/without-active-course",
  courseController.getStudentsWithoutActiveCourse
);

router.get("/:id", validateId, courseController.getCourseById);

router.post("/", validateCourse, courseController.createCourse);

router.put(
  "/:id",
  validateId,
  validateCourseUpdate,
  courseController.updateCourse
);

router.delete("/:id", validateId, courseController.deleteCourse);


module.exports = router;
