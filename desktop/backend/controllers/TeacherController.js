const { validationResult } = require("express-validator");
const Teacher = require("../models/Teacher");
const { Group } = require("../models");

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      where:{
        is_delete:false,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(teachers);
  } catch (error) {
    console.error("Get teachers error:", error);
    return res.status(500).json({
      message: "An error occurred while fetching teachers.",
    });
  }
};

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found.",
      });
    }

    return res.status(200).json(teacher);
  } catch (error) {
    console.error("Get teacher error:", error);
    return res.status(500).json({
      message: "An error occurred while fetching teacher details.",
    });
  }
};

// Create teacher
exports.createTeacher = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { last_name, first_name, start_date, phone } = req.body;

    const teacher = await Teacher.create({
      last_name,
      first_name,
      start_date,
      phone,
    });

    return res.status(201).json({
      message: "Teacher created successfully.",
      teacher,
    });
  } catch (error) {
    console.error("Create teacher error:", error);
    return res.status(500).json({
      message: "An error occurred while creating the teacher.",
    });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const teacher = await Teacher.findByPk(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found.",
      });
    }

    const { last_name, first_name, start_date, phone } = req.body;

    await teacher.update({
      ...(last_name !== undefined && { last_name }),
      ...(first_name !== undefined && { first_name }),
      ...(start_date !== undefined && { start_date }),
      ...(phone !== undefined && { phone }),
    });

    return res.status(200).json({
      message: "Teacher updated successfully.",
      teacher,
    });
  } catch (error) {
    console.error("Update teacher error:", error);
    return res.status(500).json({
      message: "An error occurred while updating the teacher.",
    });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found.",
      });
    }

    await teacher.update({is_delete:true});
    const group = await Group.findOne({where : {head_teacher_id:teacher.id}})
    if(group){
      await group.update({head_teacher_id:null})
    }

    return res.status(200).json({
      message: "Teacher deleted successfully.",
    });
  } catch (error) {
    console.error("Delete teacher error:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the teacher.",
    });
  }
};