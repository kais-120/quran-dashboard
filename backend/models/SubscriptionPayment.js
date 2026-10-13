const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SubscriptionPayment = sequelize.define(
  "SubscriptionPayment",
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
    subscription_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    // "pay" = this payment completed the month, "part" = month still incomplete
    status: {
      type: DataTypes.ENUM("pay", "part"),
      allowNull: false,
      defaultValue: "part",
    },
  },
  {
    tableName: "subscription_payment",
    timestamps: true,
    indexes: [{ fields: ["subscription_id", "year", "month"] }],
  }
);

module.exports = SubscriptionPayment;