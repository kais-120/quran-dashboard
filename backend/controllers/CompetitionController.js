const CompetitionScore = require("../models/CompetitionScore");
const StudentGroup = require("../models/StudentGroup");
const Group = require("../models/Group"); // adjust path/name to your model
const { Teacher, Student } = require("../models");
const { Op } = require("sequelize");

exports.getScores = async (req, res, next) => {
  try {
    const rows = await CompetitionScore.findAll({
      where: { year: req.query.year },
      attributes: ["year", "group_id", "student_group_id", "score"],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.saveScores = async (req, res, next) => {
  try {
    const { year, group_id, scores } = req.body;

    if (!scores.length) return res.json({ success: true });

    // every member must belong to the chosen group
    const ids = [...new Set(scores.map((s) => String(s.student_group_id)))];
    const members = await StudentGroup.findAll({
      where: { id: ids, group_id },
      attributes: ["id"],
    });
    if (members.length !== ids.length) {
      return res.status(400).json({ message: "عضو لا ينتمي لهذا الفوج" });
    }

    const rows = scores.map((s) => ({
      year,
      group_id,
      student_group_id: s.student_group_id,
      score: s.score,
    }));

    // PostgreSQL: ON CONFLICT (year, student_group_id) DO UPDATE
    await CompetitionScore.bulkCreate(rows, {
      conflictAttributes: ["year", "student_group_id"],
      updateOnDuplicate: ["group_id", "score"],
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.addStranger = async (req, res, next) => {
  try {
    const { group_id, name, phone } = req.body;

    const group = await Group.findByPk(group_id);
    if (!group) return res.status(404).json({ message: "الفوج غير موجود" });

    const row = await StudentGroup.create({
      group_id,
      type: "stranger",
      name,
      phone: phone || null,
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

exports.removeStranger = async (req, res, next) => {
  try {
    // only strangers can be removed here; their scores are deleted by CASCADE
    const deleted = await StudentGroup.destroy({
      where: { id: req.params.id, type: "stranger" },
    });
    if (!deleted) return res.status(404).json({ message: "غير موجود" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


exports.getGroups = async (req, res) => {
  try {
    const year =
      parseInt(req.query.year, 10) || StudentGroup.getAcademicYear();

    const groups = await Group.findAll({
      include: [
        {
          model: Teacher,
          as: "headTeacher",
          attributes: ["id", "first_name", "last_name"],
          required: false,
        },
        {
          model: StudentGroup,
          as: "studentGroup",
          required: false,
          where: {
            [Op.or]: [
              // students: added in the selected year or before it
              { type: "student", year: { [Op.lte]: year } },
              // strangers: only the selected year
              { type: "stranger", year },
            ],
          },
          include: [
            {
              model: Student,
              as: "students",
              attributes: ["id", "name", "father_name", "father_phone"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Remove duplicate students (same student with rows in several years)
    const result = groups.map((g) => {
      const json = g.toJSON();
      const seen = new Set();
      json.studentGroup = (json.studentGroup || []).filter((sg) => {
        if (sg.type !== "student") return true;
        if (seen.has(sg.student_id)) return false;
        seen.add(sg.student_id);
        return true;
      });
      return json;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get groups error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching groups.",
    });
  }
};