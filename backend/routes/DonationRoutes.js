
const express = require("express");
const router = express.Router();

const donationController = require("../controllers/DonationController");

const {
  validateId,
  validateDonation,
} = require("../validators/DonationValidator");

router.get("/", donationController.getDonations);

router.get("/:id", validateId, donationController.getDonationById);

router.post("/", validateDonation, donationController.createDonation);

router.put(
  "/:id",
  validateId,
  validateDonation,
  donationController.updateDonation
);

router.delete("/:id", validateId, donationController.deleteDonation);

module.exports = router;
