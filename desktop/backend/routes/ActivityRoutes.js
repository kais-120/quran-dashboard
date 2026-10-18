
const express = require("express");
const router = express.Router();

const {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} = require("../controllers/ActivityController");

const {
  getActivitiesValidator,
  activityIdValidator,
  createActivityValidator,
  updateActivityValidator,
} = require("../validators/ActivityValidator");

router
  .route("/")
  .get(getActivitiesValidator, getActivities)
  .post(createActivityValidator, createActivity);

router
  .route("/:id")
  .put(updateActivityValidator, updateActivity)
  .delete(activityIdValidator, deleteActivity);

module.exports = router;
