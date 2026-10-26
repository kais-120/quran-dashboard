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
    memorized: {
  type: DataTypes.DECIMAL(4, 2),
  allowNull: true,
  defaultValue: 0,
},
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    is_delete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue:false
    },
  },
  {
    tableName: "students",
    timestamps: true,
  }
);

module.exports = Student;