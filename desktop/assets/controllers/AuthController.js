const { validationResult, body } = require("express-validator");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.login = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Email is required"),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
    , async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        try {
            const { username, password } = req.body;

            const user = await User.findOne({
                where: { username }
            });

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.role
                },
                process.env.JWT_SECRET
            );

            return res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    }]
 
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
 
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "full_name", "username", "role", "createdAt"],
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    } 
    return res.status(200).json({
      user,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};

exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  try {
    const userId = req.userId

    const { username } = req.body;
 
    const user = await User.findOne({
      where: { id: userId},
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
 
    if (username && username !== user.username) {
      const existing = await User.findOne({
        where: { username },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "username exist" });
      }
    }
 
    user.username = username ?? user.username;
    await user.save();
 
 
    return res.status(200).json({
      message: "تم تحديث المعلومات الشخصية بنجاح.",
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};
 
exports.updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  try {
        const userId = req.userId

    const { ancien, nouveau } = req.body;
 
    const user = await User.findOne({
      where: { id: userId},
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
 
    const match = await bcrypt.compare(ancien, user.password);
    console.log(match)
    if (!match) {
      return res
        .status(400)
        .json({ errors: [{ path: "ancien", msg: "كلمة المرور الحالية غير صحيحة." }] });
    }
 
    const hashed = await bcrypt.hash(nouveau, 10);
    user.password = hashed;
    await user.save();
 

 
    return res.status(200).json({ message: "تم تحديث كلمة المرور بنجاح." });
  } catch (err) {
    console.error("updatePassword error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};