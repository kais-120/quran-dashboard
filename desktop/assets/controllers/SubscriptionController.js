
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

const Student = require("../models/Student");
const Subscription = require("../models/Subscription");
const SubscriptionPayment = require("../models/SubscriptionPayment");
const Setting = require("../models/Setting");
const sequelize = require("../config/db");

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
    return true;
  }

  return false;
};

exports.getSubscriptions = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const { name, year, month } = req.query;

    // Filters for subscription payments
    const where = {};

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    // Filter students by name
    const trimmedName = name && name.trim();
    const hasNameFilter = Boolean(trimmedName);

    const studentInclude = {
      model: Student,
      as: "student",
      required: hasNameFilter,
    };

    if (hasNameFilter) {
      studentInclude.where = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${trimmedName}%` } },
        ],
      };
    }

    const { count, rows } = await SubscriptionPayment.findAndCountAll({
      where,
      include: [
        {
          model: Subscription,
          as: "subscription",
          required: true,
          include: [studentInclude],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      message: "Subscriptions retrieved successfully",
      subscriptions: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);

    return res.status(500).json({
      message: "Failed to retrieve subscriptions",
    });
  }
};

// GET /api/subscriptions/:id
exports.getSubscriptionById = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: Student,
          as: "student",
        },
        {
          model: SubscriptionPayment,
          as: "payments",
        },
      ],
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      message: "Subscription retrieved successfully",
      subscription,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return res.status(500).json({
      message: "Failed to retrieve subscription",
    });
  }
};


exports.createSubscriptionPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const today = new Date();
    const year = String(today.getFullYear());
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const { student_id,amount } = req.body;

    if (!student_id || !(amount >= 0)) {
      await t.rollback();
      return res.status(400).json({ message: "بيانات غير صالحة" });
    }

    const student = await Student.findByPk(student_id, { transaction: t });
    if (!student) {
      await t.rollback();
      return res.status(404).json({ message: "التلميذ غير موجود" });
    }

    const setting = await Setting.findOne({ transaction: t });
    if (!setting) {
      await t.rollback();
      return res.status(400).json({ message: "الإعدادات غير موجودة" });
    }

    // find or create the single subscription of this student
    let sub = await Subscription.findOne({
      where: { student_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const created = !sub;
    if (created) {
      sub = await Subscription.create(
        {
          student_id,
          date: today.toISOString().slice(0, 10),
        },
        { transaction: t }
      );
    }

    // optional payment for the current month
    let payment = null;
    if (amount > 0) {
      const paidBefore =
        await SubscriptionPayment.sum("amount", {
          where: { subscription_id: sub.id, month, year },
          transaction: t,
        } || 0
      );

      const remaining = Number(setting.default_fee) - Number(paidBefore);
const paymentAmount = Number(amount);


if (remaining <= 0) {
  await t.rollback();
  return res.status(400).json({ message: "هذا الشهر مدفوع بالكامل" });
}

if (paymentAmount <= 0) {
  await t.rollback();
  return res.status(400).json({ message: "المبلغ يجب أن يكون أكبر من صفر" });
}

if (paymentAmount > remaining) {
  await t.rollback();
  return res
    .status(400)
    .json({ message: `المبلغ أكبر من المتبقي (${remaining})` });
}

const status = paymentAmount === remaining ? "pay" : "part";

payment = await SubscriptionPayment.create(
  {
    subscription_id: sub.id,
    amount: paymentAmount,
    month,
    year,
    status,
  },
  { transaction: t }
);
    };

    await t.commit();
    res.status(created ? 201 : 200).json({ subscription: sub, payment });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/subscriptions/:id
exports.updateSubscription = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    const updates = {};
    const allowedFields = [
      "student_id",
      "school_year_id",
      "amount",
      "date",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const studentId = updates.student_id ?? subscription.student_id;
    const schoolYearId =
      updates.school_year_id ?? subscription.school_year_id;

    if (updates.student_id !== undefined) {
      const student = await Student.findByPk(studentId);

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }
    }

    if (updates.school_year_id !== undefined) {
      const SchoolYear = require("../models/SchoolYear");
      const schoolYear = await SchoolYear.findByPk(schoolYearId);

      if (!schoolYear) {
        return res.status(404).json({
          message: "School year not found",
        });
      }
    }

    const duplicate = await Subscription.findOne({
      where: {
        student_id: studentId,
        school_year_id: schoolYearId,
        id: { [Op.ne]: subscription.id },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "This student already has a subscription for this school year",
      });
    }

    await subscription.update(updates);

    return res.status(200).json({
      message: "Subscription updated successfully",
      subscription,
    });
  } catch (error) {
    console.error("Update subscription error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "A subscription already exists for this student and school year",
      });
    }

    return res.status(500).json({
      message: "Failed to update subscription",
    });
  }
};

// DELETE /api/subscriptions/:id
exports.deleteSubscription = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    const paymentCount = await SubscriptionPayment.count({
      where: { subscription_id: subscription.id },
    });

    if (paymentCount > 0) {
      return res.status(409).json({
        message:
          "Cannot delete a subscription with payment history",
      });
    }

    await subscription.destroy();

    return res.status(200).json({
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Delete subscription error:", error);
    return res.status(500).json({
      message: "Failed to delete subscription",
    });
  }
};
