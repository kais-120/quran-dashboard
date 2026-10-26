
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Donation = sequelize.define(
  "Donation",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    donor_type: {
      type: DataTypes.ENUM("person", "organization", "anonymous"),
      allowNull: false,
      defaultValue: "person",
    },
    donor_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    donor_phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    kind: {
      type: DataTypes.ENUM("money", "in_kind"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      validate: {
        min: 0.001,
      },
    },
    item: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "donations",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Donation;
