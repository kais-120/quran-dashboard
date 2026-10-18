
const { Op } = require('sequelize');
const Expense = require('../models/Expense');

exports.getExpenses = async (req, res) => {
  try {
    const { search, month } = req.query;
    const where = {};

    if (search && search.trim()) {
      where.title = {
        [Op.iLike]: `%${search.trim()}%`,
      };
    }

    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({
          message: 'Invalid month format. Use YYYY-MM.',
        });
      }

      where.date = {
        [Op.between]: [
          `${month}-01`,
          `${month}-${new Date(
            Number(month.slice(0, 4)),
            Number(month.slice(5, 7)),
            0
          ).getDate()}`,
        ],
      };
    }

    const expenses = await Expense.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return res.status(200).json(expenses);
  } catch (error) {
    console.error('getExpenses:', error);
    return res.status(500).json({
      message: 'Failed to retrieve expenses.',
    });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { title, amount, date, note } = req.body;

    const expense = await Expense.create({
      title: title.trim(),
      amount,
      date,
      note: note?.trim() || null,
    });

    return res.status(201).json({
      message: 'Expense created successfully.',
      data: expense,
    });
  } catch (error) {
    console.error('createExpense:', error);
    return res.status(500).json({
      message: 'Failed to create expense.',
    });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found.',
      });
    }

    const { title, amount, date, note } = req.body;

    await expense.update({
      title: title.trim(),
      amount,
      date,
      note: note?.trim() || null,
    });

    return res.status(200).json({
      message: 'Expense updated successfully.',
      data: expense,
    });
  } catch (error) {
    console.error('updateExpense:', error);
    return res.status(500).json({
      message: 'Failed to update expense.',
    });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found.',
      });
    }

    await expense.destroy();

    return res.status(200).json({
      message: 'Expense deleted successfully.',
    });
  } catch (error) {
    console.error('deleteExpense:', error);
    return res.status(500).json({
      message: 'Failed to delete expense.',
    });
  }
};
