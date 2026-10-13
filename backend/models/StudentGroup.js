const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudentGroup = sequelize.define(
  "StudentGroup",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    group_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "groups",
        key: "id",
      },
    },
  },
  {
    tableName: "student_groups",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["student_id", "group_id"],
      },
    ],
  }
);

module.exports = StudentGroup;