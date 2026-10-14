
require("dotenv").config();

const { Sequelize, QueryTypes } = require("sequelize");

const dbName = process.env.DATABASE;
const dbUser = process.env.PASSWORDDB;
const dbPassword = process.env.USERNAMEDB;
const dbHost = process.env.HOSTDB || "localhost";
const dbPort = process.env.PORTDB || 5432;

const sequelize = new Sequelize("postgres", dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: "postgres",
  logging: false,
});

async function createDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL.");

    const databases = await sequelize.query(
      "SELECT datname FROM pg_database WHERE datname = :dbName",
      {
        replacements: { dbName },
        type: QueryTypes.SELECT,
      }
    );

    if (databases.length === 0) {
      await sequelize.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error("Database creation failed:", error.message);
  } finally {
    await sequelize.close();
  }
}

createDatabase();
