
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Course = sequelize.define(
  "Course",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 150],
      },
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active","finish"),
      defaultValue: "active",
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterOrEqualStartDate(value) {
          if (this.start_date && value < this.start_date) {
            throw new Error(
              "End date must be on or after the start date."
            );
          }
        },
      },
    },
  },
  {
    tableName: "courses",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Course;
