const { validationResult } = require("express-validator");
const Setting = require("../models/Setting");
const path = require('path');
const fs = require('fs');



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


exports.updateLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const logo = `/uploads/${req.file.filename}`;

    const setting = await Setting.findOne();

    if (!setting) {
      fs.unlinkSync(req.file.path);

      return res.status(404).json({
        message: 'Settings not found',
      });
    }

    // Remove the previous uploaded logo, if applicable
    if (setting.logo && setting.logo.startsWith('/uploads/')) {
      const oldLogoPath = path.join(
        process.cwd(),
        setting.logo.replace(/^\/uploads\//, 'uploads/')
      );

      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    await setting.update({ logo });

    return res.json({ logo });
  } catch (error) {
    console.error('Update logo error:', error);

    return res.status(500).json({
      message: 'Failed to update logo',
    });
  }
};