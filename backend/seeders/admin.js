// seeders/adminSeeder.js
require("dotenv").config()

const bcrypt = require("bcrypt");
const sequelize = require("../config/db");
const User = require("../models/User");

const adminData = {
  full_name: "Admin",
  username: "admin",
  password: "admin123",
  role:"admin"
};

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    await User.sync();

    const existing = await User.findOne({
      where: { username: adminData.username },
    });

    if (existing) {
      console.log("ℹ️  Admin user already exists, skipping.");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    await User.create({
      ...adminData,
      password: hashedPassword,

    });

    console.log("✅ Admin user seeded successfully.");
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

seedAdmin();