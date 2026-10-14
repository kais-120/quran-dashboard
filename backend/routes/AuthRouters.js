const express = require("express");
const { login, updateProfile, updatePassword, getProfile } = require("../controllers/AuthController");
const { updateValidator } = require("../validators/AuthValidator");
const AuthenticateToken = require("../middleware/AuthenticateToken");
const router = express.Router()

router.post("/login",login)

router.get(
  "/profile",
  AuthenticateToken,
  getProfile
);
 
router.put(
  "/profile",
  AuthenticateToken,
  updateValidator,
  updateProfile
);

router.put(
  "/password",
  AuthenticateToken,
  updatePassword
);

module.exports = router