const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Academic year starts in September: Sep 2026 -> Aug 2027 = 2026
const getAcademicYear = (date = new Date()) =>
  date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;

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
      allowNull: true,
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("student", "stranger"),
      allowNull: false,
      defaultValue: "student",
    },
    // used only when type = "stranger"
    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    group_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "groups", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: () => getAcademicYear(),
    },
  },
  {
    tableName: "student_groups",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["student_id", "group_id", "year"],
      },
      {
        fields: ["group_id", "year"],
      },
    ],
    validate: {
      identity() {
        if (this.type === "student" && !this.student_id) {
          throw new Error("student_id is required for type student");
        }
        if (this.type === "stranger" && !String(this.name || "").trim()) {
          throw new Error("name is required for type stranger");
        }
      },
    },
  }
);

StudentGroup.getAcademicYear = getAcademicYear;

module.exports = StudentGroup;