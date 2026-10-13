const express = require("express");
const router = express.Router();

const {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} = require("../controllers/GroupController");

const {
  createValidator,
  updateValidator,
} = require("../validators/GroupValidator");

router.get("/", getGroups);
router.get("/:id", getGroupById);
router.post("/", createValidator, createGroup);
router.put("/:id", updateValidator, updateGroup);
router.delete("/:id", deleteGroup);

module.exports = router;