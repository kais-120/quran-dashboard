const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateSettings,
} = require("../controllers/SettingController");

const {
  updateValidator,
} = require("../validators/SettingValidator");

router.get("/", getSettings);
router.put("/", updateValidator, updateSettings);

module.exports = router;