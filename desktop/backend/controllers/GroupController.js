const { validationResult } = require("express-validator");
const { Teacher, Group, StudentGroup, Student } = require("../models");


// Get all groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      include: [
        {
          model: Teacher,
          as: "headTeacher",
          attributes: ["id", "first_name", "last_name"],
          required: false,
        },
        {
            model:StudentGroup,
            where:{type:"student"},
            as:"studentGroup",
            include:[
                {
                    model:Student,
                    as:"students",
                    attributes:["id","name","father_name","father_phone"]
                }
            ]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching groups.",
    });
  }
};

// Get group by ID
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        {
          model: Teacher,
          as: "headTeacher",
          attributes: ["id", "first_name", "last_name"],
          required: false,
        },
        {
            model:StudentGroup,
            as:"studentGroup"
        }
      ],
    });

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Get group error:", error);

    return res.status(500).json({
      message: "An error occurred while fetching the group.",
    });
  }
};

// Create group
exports.createGroup = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { label, head_teacher_id } = req.body;

    if (head_teacher_id != null) {
      const teacher = await Teacher.findByPk(head_teacher_id);

      if (!teacher) {
        return res.status(404).json({
          message: "Head teacher not found.",
        });
      }
    }

    const group = await Group.create({
      label,
      head_teacher_id: head_teacher_id ?? null,
    });

    const result = await Group.findByPk(group.id, {
      include: [
        {
          model: Teacher,
          as: "headTeacher",
          attributes: ["id", "first_name", "last_name"],
          required: false,
        },
      ],
    });

    return res.status(201).json({
      message: "Group created successfully.",
      group: result,
    });
  } catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
      message: "An error occurred while creating the group.",
    });
  }
};

// Update group
exports.updateGroup = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const group = await Group.findByPk(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    const { label, head_teacher_id } = req.body;

    if (head_teacher_id !== undefined && head_teacher_id !== null) {
      const teacher = await Teacher.findByPk(head_teacher_id);

      if (!teacher) {
        return res.status(404).json({
          message: "Head teacher not found.",
        });
      }
    }

    await group.update({
      ...(label !== undefined && { label }),
      ...(head_teacher_id !== undefined && { head_teacher_id }),
    });

    const updatedGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: Teacher,
          as: "headTeacher",
          attributes: ["id", "first_name", "last_name"],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      message: "Group updated successfully.",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Update group error:", error);

    return res.status(500).json({
      message: "An error occurred while updating the group.",
    });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    await group.destroy();

    return res.status(200).json({
      message: "Group deleted successfully.",
    });
  } catch (error) {
    console.error("Delete group error:", error);

    return res.status(500).json({
      message: "An error occurred while deleting the group.",
    });
  }
};