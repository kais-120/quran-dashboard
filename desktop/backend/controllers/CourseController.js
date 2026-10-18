
const { Op, QueryTypes } = require("sequelize");
const Course = require("../models/Course");
const { Student, CourseStudent } = require("../models");
const sequelize = require("../config/db");

const includeStudents = {
  model: Student,
  as: "students",
  attributes: ["id", "name","father_name","father_phone"],
  through: { attributes: [] },
};

exports.getCourses = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};

    if (search && search.trim()) {
      where.name = { [Op.iLike]: `%${search.trim()}%` };
    }

    const courses = await Course.findAll({
      where,
      include: [includeStudents],
      order: [["start_date", "DESC"], ["id", "DESC"]],
    });

    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    return res.status(500).json({
      message: "Failed to retrieve courses.",
    });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [includeStudents],
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error("Get course error:", error);
    return res.status(500).json({
      message: "Failed to retrieve course.",
    });
  }
};

exports.createCourse = async (req, res) => {
  console.log("first")
  const transaction = await Course.sequelize.transaction();

  try {
    const { name, start_date, end_date, student_ids = [] } = req.body;

    // Validate student existence before inserting assignments.
    const uniqueIds = [...new Set(student_ids.map(String))];

    const students = await Student.findAll({
      where: { id: { [Op.in]: uniqueIds } },
      attributes: ["id"],
      transaction,
    });

    if (students.length !== uniqueIds.length) {
      await transaction.rollback();

      return res.status(400).json({
        message: "One or more selected students do not exist.",
      });
    }

    const course = await Course.create(
      {
        name: name.trim(),
        start_date,
        end_date,
      },
      { transaction }
    );

    if (uniqueIds.length > 0) {
      await course.setStudents(uniqueIds, { transaction });
    }

    await transaction.commit();

    const result = await Course.findByPk(course.id, {
      include: [includeStudents],
    });

    return res.status(201).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();

    console.error("Create course error:", error);

    return res.status(500).json({
      message: "Failed to create course.",
    });
  }
};

exports.updateCourse = async (req, res) => {
  const transaction = await Course.sequelize.transaction();

  try {
    const course = await Course.findByPk(req.params.id, {
      transaction,
    });

    if (!course) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const { name, start_date, end_date, student_ids } = req.body;

    const nextStart = start_date ?? course.start_date;
    const nextEnd = end_date ?? course.end_date;

    if (nextEnd < nextStart) {
      await transaction.rollback();

      return res.status(400).json({
        message: "End date must be on or after the start date.",
      });
    }

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;

    await course.update(updates, { transaction });

    // Only replace assignments when student_ids is provided.
    if (student_ids !== undefined) {
      const uniqueIds = [...new Set(student_ids.map(String))];

      const students = await Student.findAll({
        where: { id: { [Op.in]: uniqueIds } },
        attributes: ["id"],
        transaction,
      });

      if (students.length !== uniqueIds.length) {
        await transaction.rollback();

        return res.status(400).json({
          message: "One or more selected students do not exist.",
        });
      }

      await course.setStudents(uniqueIds, { transaction });
    }

    await transaction.commit();

    const result = await Course.findByPk(course.id, {
      include: [includeStudents],
    });

    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();

    console.error("Update course error:", error);

    return res.status(500).json({
      message: "Failed to update course.",
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    await course.destroy();

    return res.status(200).json({
      message: "Course deleted successfully.",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    return res.status(500).json({
      message: "Failed to delete course.",
    });
  }
};

exports.getStudentsWithoutActiveCourse = async (req, res) => {
  try {
    const students = await sequelize.query(
      `
      SELECT
        s.id,
        s.name,
        s.father_name,
        s.father_phone,
        s.birthdate
      FROM students s
      WHERE s.is_delete = false
      AND NOT EXISTS (
        SELECT 1
        FROM course_students cs
        INNER JOIN courses c ON c.id = cs.course_id
        WHERE cs.student_id = s.id
          AND c.status = 'active'
      )
      ORDER BY s.name ASC
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      message: "Students without an active course retrieved successfully",
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Error fetching students without active courses:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



// Remove a student from a group
exports.deleteStudentCourse = async (req, res) => {
  try {
    const assignment = await CourseStudent.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        message: "Student-group assignment not found.",
      });
    }

    await assignment.destroy();

    return res.status(200).json({
      message: "Student removed from group successfully.",
    });
  } catch (error) {
    console.error("Delete student group error:", error);

    return res.status(500).json({
      message: "An error occurred while removing the student from the group.",
    });
  }
};