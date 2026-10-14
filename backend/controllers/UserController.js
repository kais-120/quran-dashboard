
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const User = require("../models/User");

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { full_name, username, password } = req.body;

    const existingUser = await User.findOne({
      where: { username },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      full_name,
      username,
      password: hashedPassword,
    });

    const { password: _, ...userData } = user.toJSON();

    return res.status(201).json({
      message: "User created successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {

    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["id", "DESC"]],
    });

    return res.status(200).json({
      users ,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { full_name, username, password } = req.body;

    if (username !== undefined) {
      const existingUser = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: user.id },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Username already exists",
        });
      }
    }

    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name;
    if (username !== undefined) updates.username = username;

    if (password !== undefined && password !== "") {
      updates.password = await bcrypt.hash(password, 12);
    }

    await user.update(updates);

    const { password: _, ...userData } = user.toJSON();

    return res.status(200).json({
      message: "User updated successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await user.destroy();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
