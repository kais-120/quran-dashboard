
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define(
  'Expense',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 150],
      },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.001,
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'expenses',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Expense;
