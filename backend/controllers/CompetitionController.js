const { Op } = require('sequelize');
const sequelize = require('../config/db');
const CompetitionScore = require('../models/CompetitionScore');
const Group = require('../models/Group');
const StudentGroup = require('../models/StudentGroup');

// GET /competitions?year=2026
exports.getScores = async (req, res) => {
  try {
    const rows = await CompetitionScore.findAll({
      where: { year: req.query.year },
      attributes: ['year', 'group_id', 'student_id', 'score'],
      raw: true,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /competitions/scores
// body: { year, group_id, scores: [{ student_id, score }] }
exports.saveScores = async (req, res) => {
  try {
    const { year, group_id, scores } = req.body;

    const group = await Group.findByPk(group_id);
    if (!group) return res.status(404).json({ message: 'الفوج غير موجود' });

    // المنافسة داخل الفوج الواحد: كل تلميذ يجب أن ينتمي لهذا الفوج
    const members = await StudentGroup.findAll({
      where: { group_id },
      attributes: ['student_id'],
      raw: true,
    });
    const memberIds = new Set(members.map((m) => Number(m.student_id)));

    const outsider = scores.find((s) => !memberIds.has(Number(s.student_id)));
    if (outsider) {
      return res.status(400).json({ message: 'يوجد تلميذ لا ينتمي إلى هذا الفوج' });
    }

    await sequelize.transaction(async (t) => {
      const ids = scores.map((s) => s.student_id);

      // الخانات الفارغة = حذف النقطة السابقة (إن وجدت) لتلاميذ هذا الفوج
      await CompetitionScore.destroy({
        where: {
          year,
          group_id,
          ...(ids.length ? { student_id: { [Op.notIn]: ids } } : {}),
        },
        transaction: t,
      });

      if (ids.length) {
        await CompetitionScore.bulkCreate(
          scores.map((s) => ({
            year,
            group_id,
            student_id: s.student_id,
            score: s.score,
          })),
          {
            updateOnDuplicate: ['group_id', 'score', 'updatedAt'],
            transaction: t,
          }
        );
      }
    });

    res.json({ message: 'تم حفظ النقاط' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};