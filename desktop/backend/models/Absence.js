
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Absence = sequelize.define(
  "Absence",
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

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    justified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "absences",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["student_id"],
      },
      {
        fields: ["date"],
      },
      {
        fields: ["student_id", "date"],
      },
    ],
  }
);

module.exports = Absence;
