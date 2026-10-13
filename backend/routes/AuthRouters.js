const express = require("express");
const { login, updateProfile } = require("../controllers/AuthController");
const { updateValidator } = require("../validators/AuthValidator");
const router = express.Router()

router.post("/login",login)
 
router.put(
  "/profile",
  updateValidator,
  updateProfile
);

module.exports = router