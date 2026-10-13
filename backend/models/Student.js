const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Student = sequelize.define(
  "student",
  {
    id: {
      type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    father_name: {
      type: DataTypes.STRING(100),
    },
    father_phone: {
      type: DataTypes.STRING(20),
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "students",
    timestamps: true,
  }
);

module.exports = Student;