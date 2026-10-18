const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Group = sequelize.define(
  "Group",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    head_teacher_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "teachers",
        key: "id",
      },
    },
  },
  {
    tableName: "groups",
    timestamps: true,
  }
);

module.exports = Group;