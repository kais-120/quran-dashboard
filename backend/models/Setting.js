const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Setting = sequelize.define(
  "setting",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    association_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "جمعية القرآن الكريم",
    },
    school_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "2025/2026",
    },
    default_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 0,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    address: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "settings",
    timestamps: true,
  }
);

module.exports = Setting;