
const express = require("express");
const router = express.Router();

const subscriptionController = require("../controllers/SubscriptionController");

const {
  updateSubscriptionValidator,
  subscriptionIdValidator,
  listSubscriptionsValidator,
  createSubscriptionPaymentValidator,
} = require("../validators/SubscriptionValidator");

router.get(
  "/",
  listSubscriptionsValidator,
  subscriptionController.getSubscriptions
);

router.get(
  "/:id",
  subscriptionIdValidator,
  subscriptionController.getSubscriptionById
);

router.post(
  "/",
  createSubscriptionPaymentValidator,
  subscriptionController.createSubscriptionPayment
);


router.put(
  "/:id",
  updateSubscriptionValidator,
  subscriptionController.updateSubscription
);

router.delete(
  "/:id",
  subscriptionIdValidator,
  subscriptionController.deleteSubscription
);

module.exports = router;
