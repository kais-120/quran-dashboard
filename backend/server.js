const express = require("express");
require("dotenv").config();
const cors = require("cors");
const sequelize = require("./config/db");
const app = express();
const appStart = require("./app");
require("./models/index")




const port = process.env.PORT || 5000;

const startDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Neon PostgreSQL connected");

    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");
  } catch (error) {
    console.error("❌ Database error:", error);
  }
};

startDatabase();
app.use(express.json());
app.use(cors());

app.use("/api/v1", appStart);


app.listen(port, async () => {
  sequelize
  console.log(`Server started on port ${port}`);

});