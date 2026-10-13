const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Subscription = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "subscriptions",
    timestamps: true,
  }
);

module.exports = Subscription;