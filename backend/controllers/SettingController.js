const { validationResult } = require("express-validator");
const Setting = require("../models/Setting");


exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne({
      order: [["id", "ASC"]],
    });

    return res.status(200).json(settings);
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching settings.",
    });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const allowedFields = [
      "association_name",
      "school_year",
      "default_fee",
      "phone",
      "address",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    let settings = await Setting.findOne({
      order: [["id", "ASC"]],
    });

      await settings.update(updates);

    return res.status(200).json({
      message: "Settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);

    return res.status(500).json({
      message: "An error occurred while updating settings.",
    });
  }
};