
const { Teacher, StudentGroup, Group, Student } = require("../models");

// Get all student-group assignments
exports.getStudentGroups = async (req, res) => {
  try {
    const studentGroups = await StudentGroup.findAll({
      include: [
        {
          model: Student,
          as: "students",
        },
        {
          model: Group,
          as: "group",
          include: [
            {
              model: Teacher,
              as: "headTeacher",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(studentGroups);
  } catch (error) {
    console.error("Get student groups error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching student-group assignments.",
    });
  }
};

// Get assignments for one student
exports.getStudentGroupsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    const studentGroups = await StudentGroup.findAll({
      where: { student_id: studentId },
      include: [
        {
          model: Group,
          as: "group",
          include: [
            {
              model: Teacher,
              as: "headTeacher",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(studentGroups);
  } catch (error) {
    console.error("Get student assignments error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching the student's groups.",
    });
  }
};

// Get students assigned to one group
exports.getGroupStudentsById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    const studentGroups = await StudentGroup.findAll({
      where: { group_id: groupId },
      include: [
        {
          model: Student,
          as: "students",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(studentGroups);
  } catch (error) {
    console.error("Get group students error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching the group's students.",
    });
  }
};

// Assign a student to a group
exports.createStudentGroup = async (req, res) => {
  try {
    const { student_id, group_id } = req.body;

    if (!student_id || !group_id) {
      return res.status(400).json({
        message: "Student ID and group ID are required.",
      });
    }

    const student = await Student.findByPk(student_id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    const group = await Group.findByPk(group_id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    const existingAssignment = await StudentGroup.findOne({
      where: {
        student_id,
        group_id,
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        message: "This student is already assigned to this group.",
      });
    }

    const assignment = await StudentGroup.create({
      student_id,
      group_id,
    });

    const result = await StudentGroup.findByPk(assignment.id, {
      include: [
        { model: Student, as: "students" },
        { model: Group, as: "group" },
      ],
    });

    return res.status(201).json({
      message: "Student assigned to group successfully.",
      studentGroup: result,
    });
  } catch (error) {
    console.error("Create student group error:", error);

    return res.status(500).json({
      message: "An error occurred while assigning the student to the group.",
    });
  }
};

// Move a student to another group
exports.updateStudentGroup = async (req, res) => {
  try {
    const { student_id, group_id } = req.body;


    const student = await Student.findByPk(student_id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    const group = await Group.findByPk(group_id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    const duplicate = await StudentGroup.findOne({
      where: {
        student_id: student_id,
        group_id: group_id,
      },
    });

    if (duplicate && String(duplicate.id) !== String(assignment.id)) {
      return res.status(409).json({
        message: "This student is already assigned to this group.",
      });
    }

    const studentGroup = await StudentGroup.create({student_id,group_id});

    return res.status(200).json({
      message: "Student-group updated successfully.",
      studentGroup: studentGroup,
    });
  } catch (error) {
    console.error("Update student group error:", error);

    return res.status(500).json({
      message: "An error occurred while updating the student-group assignment.",
    });
  }
};

// Remove a student from a group
exports.deleteStudentGroup = async (req, res) => {
  try {
    const assignment = await StudentGroup.findByPk(req.params.id);

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