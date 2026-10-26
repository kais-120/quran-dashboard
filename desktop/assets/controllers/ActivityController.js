
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

const Activity = require("../models/Activity");

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

// GET /api/v1/activities
exports.getActivities = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { q } = req.query;
    const where = {};

    if (q && q.trim()) {
      where.name = {
        [Op.iLike]: `%${q.trim()}%`,
      };
    }

    const activities = await Activity.findAll({
      where,
      order: [
        ["start_date", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.status(200).json(activities);
  } catch (error) {
    console.error("getActivities:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب النشاطات",
    });
  }
};

// POST /api/v1/activities
exports.createActivity = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { name, start_date, end_date } = req.body;

    const activity = await Activity.create({
      name: name.trim(),
      start_date,
      end_date,
    });

    return res.status(201).json({
      message: "تمت إضافة النشاط بنجاح",
      data: activity,
    });
  } catch (error) {
    console.error("createActivity:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "بيانات النشاط غير صالحة",
        errors: error.errors.map((e) => ({
          msg: e.message,
          path: e.path,
        })),
      });
    }

    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة النشاط",
    });
  }
};

// PUT /api/v1/activities/:id
exports.updateActivity = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({
        message: "النشاط غير موجود",
      });
    }

    await activity.update({
      name: name.trim(),
      start_date,
      end_date,
    });

    return res.status(200).json({
      message: "تم تعديل النشاط بنجاح",
      data: activity,
    });
  } catch (error) {
    console.error("updateActivity:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "بيانات النشاط غير صالحة",
        errors: error.errors.map((e) => ({
          msg: e.message,
          path: e.path,
        })),
      });
    }

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل النشاط",
    });
  }
};

// DELETE /api/v1/activities/:id
exports.deleteActivity = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const activity = await Activity.findByPk(req.params.id);

    if (!activity) {
      return res.status(404).json({
        message: "النشاط غير موجود",
      });
    }

    await activity.destroy();

    return res.status(200).json({
      message: "تم حذف النشاط بنجاح",
    });
  } catch (error) {
    console.error("deleteActivity:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف النشاط",
    });
  }
};
