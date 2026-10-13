
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CourseStudent = sequelize.define(
  "course_students",
  {
    course_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: "courses",
        key: "id",
      },
    },
    student_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: "students",
        key: "id",
      },
    },
  },
  {
    tableName: "course_students",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CourseStudent;
