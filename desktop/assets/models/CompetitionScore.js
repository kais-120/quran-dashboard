const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CompetitionScore = sequelize.define(
  "CompetitionScore",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.INTEGER, allowNull: false },
    group_id: { type: DataTypes.BIGINT, allowNull: false },
    // membership row: works for both students and strangers
    student_group_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "student_groups", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
  },
  {
    tableName: "competition_scores",
    indexes: [
      // عضو واحد = نقطة واحدة في السنة
      {
        unique: true,
        name: "uq_competition_year_member",
        fields: ["year", "student_group_id"],
      },
      { name: "idx_competition_year_group", fields: ["year", "group_id"] },
    ],
  }
);

module.exports = CompetitionScore;