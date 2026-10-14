// seeders/adminSeeder.js
require("dotenv").config()

const sequelize = require("../config/db");
const Setting = require("../models/Setting");

const associationData = {
  association_name: 'جمعية القرآن الكريم',
  school_year: '2025/2026',
  default_fee: 50,
  phone: '12345678',
  address: 'El-faouar',
};

const seedAssociation = async () => {
  try {
    await sequelize.authenticate();
    await Setting.sync();

    const existing = await Setting.findOne({
      where: { association_name: associationData.association_name },
    });

    if (existing) {
      console.log("ℹ️  association already exists, skipping.");
      return;
    }


    await Setting.create({
      ...associationData,

    });

    console.log("✅ Association seeded successfully.");
  } catch (error) {
    console.error("❌ Failed to seed association:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

seedAssociation();