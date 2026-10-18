
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const { TeacherPayment, Teacher } = require("../models");
const { validationResult } = require("express-validator");

exports.createTeacherPayment = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, teacher_id, date_payment } = req.body;

    const teacher = await Teacher.findByPk(teacher_id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    // Generate year and month in the controller
    const paymentDate = date_payment
      ? new Date(date_payment)
      : new Date();

    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({
        message: "Invalid payment date",
      });
    }

    const year = String(paymentDate.getFullYear());
    const month = String(paymentDate.getMonth() + 1).padStart(2, "0");

    const payment = await TeacherPayment.create({
      amount,
      teacher_id,
      date_payment: paymentDate,
      year,
      month,
    });

    return res.status(201).json({
      message: "Teacher payment created successfully",
      payment,
    });
  } catch (error) {
    console.error("Create teacher payment error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getAllTeacherPayments = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { teacher_id, year, month } = req.query;

    const where = {};

    if (teacher_id) where.teacher_id = teacher_id;
    if (year) where.year = year;
    if (month) where.month = month;

    const { count, rows } = await TeacherPayment.findAndCountAll({
      where,
      limit,
      offset,
      order: [["date_payment", "DESC"]],
      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "first_name", "last_name","phone"],
        },
      ],
    });

    return res.status(200).json({
      payments: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Get teacher payments error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getTeacherPaymentById = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await TeacherPayment.findByPk(req.params.id, {
      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "first_name", "last_name"],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        message: "Teacher payment not found",
      });
    }

    return res.status(200).json({ payment });
  } catch (error) {
    console.error("Get teacher payment error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.updateTeacherPayment = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await TeacherPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        message: "Teacher payment not found",
      });
    }

    const allowedFields = [
      "amount",
      "date_payment",
      "year",
      "month",
      "teacher_id",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.teacher_id !== undefined) {
      const teacher = await Teacher.findByPk(updates.teacher_id);

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found",
        });
      }
    }

    await payment.update(updates);

    return res.status(200).json({
      message: "Teacher payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Update teacher payment error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.deleteTeacherPayment = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await TeacherPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        message: "Teacher payment not found",
      });
    }

    await payment.destroy();

    return res.status(200).json({
      message: "Teacher payment deleted successfully",
    });
  } catch (error) {
    console.error("Delete teacher payment error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getTeachersNotPaidCurrentMonth = async (req, res) => {
  try {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const teachers = await sequelize.query(
      `
      SELECT
        t.id,
        t."first_name",
        t."last_name",
        t.phone
      FROM teachers t
      WHERE t.is_delete = false
      AND NOT EXISTS (
        SELECT 1
        FROM teacher_payment tp
        WHERE tp.teacher_id = t.id
          AND tp.year = :year
          AND tp.month = :month
      )
      ORDER BY t."last_name" ASC, t."first_name" ASC
      `,
      {
        replacements: { year, month },
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      year,
      month,
      count: teachers.length,
      teachers,
    });
  } catch (error) {

    console.error("Get teachers not paid current month error:", error);

    return res.status(500).json({
      message: "Internal server error" + error,
    });
  }
};