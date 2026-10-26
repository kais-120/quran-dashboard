
const { Op } = require("sequelize");
const Donation = require("../models/Donation");

const getDonationPayload = (body) => {
  const isAnonymous = body.donor_type === "anonymous";
  const isMoney = body.kind === "money";

  return {
    donor_type: body.donor_type,
    donor_name: isAnonymous ? null : body.donor_name?.trim() || null,
    donor_phone: isAnonymous ? null : body.donor_phone?.trim() || null,
    kind: body.kind,
    amount: isMoney ? body.amount : null,
    item: isMoney ? null : body.item?.trim() || null,
    quantity: isMoney ? null : body.quantity ?? null,
    date: body.date,
    note: body.note?.trim() || null,
  };
};

exports.getDonations = async (req, res) => {
  try {
    const { search, kind, month } = req.query;
    const where = {};

    if (kind && ["money", "in_kind"].includes(kind)) {
      where.kind = kind;
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();

      where.date = {
        [Op.between]: [
          `${month}-01`,
          `${month}-${String(lastDay).padStart(2, "0")}`,
        ],
      };
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;

      where[Op.or] = [
        { donor_name: { [Op.iLike]: term } },
        { donor_phone: { [Op.iLike]: term } },
        { item: { [Op.iLike]: term } },
        { note: { [Op.iLike]: term } },
      ];
    }

    const donations = await Donation.findAll({
      where,
      order: [["date", "DESC"], ["id", "DESC"]],
    });

    return res.status(200).json(donations);
  } catch (error) {
    console.error("Get donations error:", error);
    return res.status(500).json({
      message: "Failed to retrieve donations.",
    });
  }
};

exports.getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found.",
      });
    }

    return res.status(200).json(donation);
  } catch (error) {
    console.error("Get donation error:", error);
    return res.status(500).json({
      message: "Failed to retrieve donation.",
    });
  }
};

exports.createDonation = async (req, res) => {
  try {
    const donation = await Donation.create(getDonationPayload(req.body));

    return res.status(201).json(donation);
  } catch (error) {
    console.error("Create donation error:", error);

    return res.status(500).json({
      message: "Failed to create donation.",
    });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found.",
      });
    }

    await donation.update(getDonationPayload(req.body));

    return res.status(200).json(donation);
  } catch (error) {
    console.error("Update donation error:", error);

    return res.status(500).json({
      message: "Failed to update donation.",
    });
  }
};

exports.deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found.",
      });
    }

    await donation.destroy();

    return res.status(200).json({
      message: "Donation deleted successfully.",
    });
  } catch (error) {
    console.error("Delete donation error:", error);

    return res.status(500).json({
      message: "Failed to delete donation.",
    });
  }
};
