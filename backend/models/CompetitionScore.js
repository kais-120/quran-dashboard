const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CompetitionScore = sequelize.define(
  "CompetitionScore",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.INTEGER, allowNull: false },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
    student_id: { type: DataTypes.INTEGER, allowNull: false },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
  },
  {
    tableName: "competition_scores",
    indexes: [
      // تلميذ واحد = نقطة واحدة في السنة
      {
        unique: true,
        name: "uq_competition_year_student",
        fields: ["year", "student_id"],
      },
      { name: "idx_competition_year_group", fields: ["year", "group_id"] },
    ],
  },
);

module.exports = CompetitionScore;
