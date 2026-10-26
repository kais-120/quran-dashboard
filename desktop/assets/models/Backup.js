const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BackupLog = sequelize.define("BackupLog", {
  filename: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.BIGINT, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM("success", "running", "error"),
    defaultValue: "running",
  },
  uploaded_to_drive: { type: DataTypes.BOOLEAN, defaultValue: false },
  error: { type: DataTypes.TEXT, allowNull: true },
});

const GoogleToken = sequelize.define("GoogleToken", {
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  refresh_token: { type: DataTypes.TEXT, allowNull: false }, // encrypted
  email: { type: DataTypes.STRING, allowNull: true },
  folder_id: { type: DataTypes.STRING, allowNull: true },
  last_upload_at: { type: DataTypes.DATE, allowNull: true },
});

module.exports = { BackupLog, GoogleToken };