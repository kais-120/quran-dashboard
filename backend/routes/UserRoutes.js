
const express = require("express");
const router = express.Router();

const userController = require("../controllers/UserController");

const {
  createUserValidator,
  updateUserValidator,
  getUserValidator,
  deleteUserValidator,
} = require("../validators/UserValidator");

const validate = require("../middleware/ValidateRequest");

router.post(
  "/",
  createUserValidator,
  validate,
  userController.createUser
);

router.get(
  "/",
  userController.getUsers
);

router.get(
  "/:id",
  getUserValidator,
  validate,
  userController.getUserById
);

router.put(
  "/:id",
  updateUserValidator,
  validate,
  userController.updateUser
);

router.delete(
  "/:id",
  deleteUserValidator,
  validate,
  userController.deleteUser
);

module.exports = router;
