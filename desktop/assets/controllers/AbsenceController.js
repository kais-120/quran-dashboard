
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

const Absence = require("../models/Absence");
const Student = require("../models/Student");

const studentInclude = {
  model: Student,
  as: "students",
  attributes: ["id", "name"],
};

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "بيانات غير صالحة",
      errors: errors.array(),
    });
    return true;
  }

  return false;
};

// GET /api/v1/absences
exports.getAbsences = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { date, q } = req.query;

    const where = {};
    const studentWhere = {};

    if (date) {
      where.date = date;
    }

    if (q && q.trim()) {
      const search = q.trim();

      studentWhere[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const absences = await Absence.findAll({
      where,
      include: [
        {
          ...studentInclude,
          where: Object.keys(studentWhere).length
            ? studentWhere
            : undefined,
          required: Object.keys(studentWhere).length > 0,
        },
      ],
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.status(200).json(absences);
  } catch (error) {
    console.error("getAbsences:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الغيابات",
    });
  }
};

// POST /api/v1/absences
exports.createAbsence = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { student_id, date, justified = false, reason = "" } = req.body;

    const student = await Student.findByPk(student_id);

    if (!student) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    const absence = await Absence.create({
      student_id,
      date,
      justified,
      reason: reason || null,
    });

    const result = await Absence.findByPk(absence.id, {
      include: [studentInclude],
    });

    return res.status(201).json({
      message: "تم تسجيل الغياب بنجاح",
      data: result,
    });
  } catch (error) {
    console.error("createAbsence:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الغياب",
    });
  }
};

// PUT /api/v1/absences/:id
exports.updateAbsence = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;
    const { student_id, date, justified, reason = "" } = req.body;

    const absence = await Absence.findByPk(id);

    if (!absence) {
      return res.status(404).json({
        message: "سجل الغياب غير موجود",
      });
    }

    const student = await Student.findByPk(student_id);

    if (!student) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    await absence.update({
      student_id,
      date,
      justified,
      reason: reason || null,
    });

    const result = await Absence.findByPk(absence.id, {
      include: [studentInclude],
    });

    return res.status(200).json({
      message: "تم تعديل الغياب بنجاح",
      data: result,
    });
  } catch (error) {
    console.error("updateAbsence:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل الغياب",
    });
  }
};

// DELETE /api/v1/absences/:id
exports.deleteAbsence = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;

    const absence = await Absence.findByPk(id);

    if (!absence) {
      return res.status(404).json({
        message: "سجل الغياب غير موجود",
      });
    }

    await absence.destroy();

    return res.status(200).json({
      message: "تم حذف الغياب بنجاح",
    });
  } catch (error) {
    console.error("deleteAbsence:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف الغياب",
    });
  }
};
