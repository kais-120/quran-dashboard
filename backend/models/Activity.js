
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Activity = sequelize.define(
  "Activity",
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
        notEmpty: {
          msg: "اسم النشاط مطلوب",
        },
        len: {
          args: [2, 150],
          msg: "اسم النشاط يجب أن يكون بين حرفين و150 حرفًا",
        },
      },
    },

    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isEndDateValid(value) {
          if (value && this.start_date && value < this.start_date) {
            throw new Error(
              "تاريخ النهاية يجب أن يكون بعد تاريخ البدء أو مساويًا له"
            );
          }
        },
      },
    },
  },
  {
    tableName: "activities",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["name"] },
      { fields: ["start_date"] },
      { fields: ["end_date"] },
    ],
  }
);

module.exports = Activity;
