const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateSettings,
  updateLogo,
} = require("../controllers/SettingController");

const {
  updateValidator,
} = require("../validators/SettingValidator");
const upload = require("../middleware/UpdateFiles");

router.get("/", getSettings);
router.put("/", updateValidator, updateSettings);

router.put('/logo', upload.single('logo'),updateLogo )

module.exports = router;