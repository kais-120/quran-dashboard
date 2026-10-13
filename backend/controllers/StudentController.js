const { validationResult } = require("express-validator");
const Student = require("../models/Student");
const { StudentGroup, Group } = require("../models");
const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Setting = require("../models/Setting");
const Subscription = require("../models/Subscription");
const SubscriptionPayment = require("../models/SubscriptionPayment");

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include:[
        {
          model:StudentGroup,
          as:"studentGroups",
          attributes:["id"],
          include:[
           {
             model:Group,
            as:"group",
            attributes:["id","label"]
          }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],

    });

    return res.status(200).json(students);
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({
      message: "An error occurred while fetching students.",
    });
  }
};

exports.getStudentsWithoutGroup = async (req, res) => {
  try {
    const students = await Student.findAll({
      where: {
        id: {
          [Op.notIn]: sequelize.literal("(SELECT student_id FROM student_groups)"),
        },
      },
      attributes: ["id", "name", "father_name", "father_phone"],
      order: [["name", "ASC"]],
    });

    res.json(students);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error("Get student error:", error);
    return res.status(500).json({
      message: "An error occurred while fetching student details.",
    });
  }
};

exports.createStudent = [
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      const { name, father_name, father_phone, birthdate,group_id } = req.body;

      const student = await Student.create({
        name,
        father_name,
        father_phone,
        birthdate,
      });
      const today = new Date()
      await StudentGroup.create({student_id:student.id,group_id});
      const {amount} = await Setting.findOne();
      await Subscription.create({amount,student_id:student.id,date:today})

      return res.status(201).json({
        message: "Student created successfully.",
        student,
      });
    } catch (error) {
      console.error("Create student error:", error);
      return res.status(500).json({
        message: "An error occurred while creating the student.",
      });
    }
  },
];

// Update student
exports.updateStudent = [
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      const student = await Student.findByPk(req.params.id);

      if (!student) {
        return res.status(404).json({
                  message: "Student not found.",
        });
      }

      const { name, father_name, father_phone, birthdate } = req.body;

      await student.update({
        ...(name !== undefined && { name }),
        ...(father_name !== undefined && { father_name }),
        ...(father_phone !== undefined && { father_phone }),
        ...(birthdate !== undefined && { birthdate }),
      });

      return res.status(200).json({
        message: "Student updated successfully.",
        student,
      });
    } catch (error) {
      console.error("Update student error:", error);
      return res.status(500).json({
        message: "An error occurred while updating the student.",
      });
    }
  },
];

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    await student.destroy();

    return res.status(200).json({
      message: "Student deleted successfully.",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the student.",
    });
  }
};

exports.getStudentsNotPaidCurrentMonth = async (req, res) => {
  try {
    const today = new Date();
    const year = String(today.getFullYear());
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const students = await sequelize.query(
      `
      SELECT DISTINCT
        s.id,
        s.name
      FROM students s
      INNER JOIN subscriptions sub
        ON sub.student_id = s.id
      WHERE NOT EXISTS (
        SELECT 1
        FROM subscription_payment sp
        WHERE sp.subscription_id = sub.id
          AND sp.year = :year
          AND sp.month = :month
          AND sp.status = 'pay'
      )
      ORDER BY s.id DESC
      `,
      {
        replacements: { year, month },
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      year,
      month,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Error fetching unpaid students:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students who have not paid this month.",
    });
  }
};