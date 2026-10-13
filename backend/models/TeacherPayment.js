const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TeacherPayment = sequelize.define(
  "TeacherPayment",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
    },
    date_payment: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // the month this payment is FOR (not the day it was paid)
    year: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    month: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    teacher_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "teacher_payment",
    timestamps: true,
    indexes: [{ fields: ["teacher_id", "year", "month"] }],
  }
);

module.exports = TeacherPayment;