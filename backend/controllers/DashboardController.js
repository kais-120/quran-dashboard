const { Op } = require("sequelize");
const {
  Student,
  Teacher,
  Group,
  Course,
  Subscription,
  SubscriptionPayment,
} = require("../models");
const Activity = require("../models/Activity");
const Absence = require("../models/Absence");
const Expense = require("../models/Expense");
const Donation = require("../models/Donation");
const Setting = require("../models/Setting");
const TeacherPayment = require("../models/TeacherPayment");

const TIMEZONE = "Africa/Tunis";

const num = (v) => Number(v) || 0;
const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" in the association's timezone
const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());

exports.getDashboard = async (req, res) => {
  try {
    const setting = await Setting.findOne({ order: [["id", "ASC"]] });
    const associationName = setting?.association_name || "";
    const schoolYear = setting?.school_year || "";
    const defaultFee = num(setting?.default_fee);

    // current month (association timezone)
    const today = todayStr(); // YYYY-MM-DD
    const [yearStr, monthStr] = today.split("-");
    const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const monthStart = `${yearStr}-${monthStr}-01`;
    const monthEnd = `${yearStr}-${monthStr}-${pad(lastDay)}`;

    // payments store the month they are FOR in year/month columns
    const paymentMonthWhere = { year: yearStr, month: monthStr };
    const dateInMonth = { [Op.between]: [monthStart, monthEnd] };

    const [
      studentsCount,
      teachersCount,
      groupsCount,
      coursesCount,
      activitiesCount,
      subscriptionsCount,
      absencesToday,
      absencesMonth,
      paid,
      totalExpenses,
      totalTeacherPayments,
      totalDonations,
      upcomingActivities,
      latestPayments,
      latestExpenses,
      latestDonations,
    ] = await Promise.all([
      Student.count(),
      Teacher.count(),
      Group.count(),
      Course.count(),
      Activity.count(),
      Subscription.count(),
      Absence.count({ where: { date: today } }),
      Absence.count({ where: { date: dateInMonth } }),
      SubscriptionPayment.sum("amount", { where: paymentMonthWhere }),
      Expense.sum("amount", { where: { date: dateInMonth } }),
      TeacherPayment.sum("amount", { where: paymentMonthWhere }),
      Donation.sum("amount", { where: { kind: "money", date: dateInMonth } }),
      Activity.findAll({
        where: { start_date: { [Op.gte]: today } },
        order: [["start_date", "ASC"]],
        limit: 5,
        attributes: ["id", "name", "start_date", "end_date"],
      }),
      SubscriptionPayment.findAll({
        order: [["date_payment", "DESC"]],
        limit: 5,
        include: [
          {
            model: Subscription,
            as: "subscription",
            attributes: ["id"],
            include: [{ model: Student, as: "student", attributes: ["id", "name"] }],
          },
        ],
      }),
      Expense.findAll({
        order: [["date", "DESC"], ["id", "DESC"]],
        limit: 5,
        attributes: ["id", "title", "amount", "date"],
      }),
      Donation.findAll({
        order: [["date", "DESC"], ["id", "DESC"]],
        limit: 5,
        attributes: ["id", "donor_type", "donor_name", "kind", "amount", "item", "quantity", "date"],
      }),
    ]);

    const paidN = num(paid);
    const expensesN = num(totalExpenses);
    const teacherPaymentsN = num(totalTeacherPayments);
    const donationsN = num(totalDonations);

    const due = subscriptionsCount * defaultFee; // expected for one month
    const collectionRate = due ? Math.min(100, Math.round((paidN / due) * 100)) : 0;

    res.json({
      settings: { associationName, schoolYear },
      period: { year: yearStr, month: monthStr },
      counts: {
        students: studentsCount,
        teachers: teachersCount,
        groups: groupsCount,
        courses: coursesCount,
        activities: activitiesCount,
        subscriptions: subscriptionsCount,
      },
      absences: { today: absencesToday, month: absencesMonth },
      finance: {
        due,
        paid: paidN,
        remaining: Math.max(0, due - paidN),
        collectionRate,
        expenses: expensesN,
        teacherPayments: teacherPaymentsN,
        donations: donationsN,
        balance: paidN + donationsN - expensesN - teacherPaymentsN,
      },
      upcomingActivities,
      latestPayments: latestPayments.map((p) => ({
        id: p.id,
        studentName: p.subscription?.student?.name || null,
        amount: num(p.amount),
        status: p.status,
        year: p.year,
        month: p.month,
        date: p.date_payment,
      })),
      latestExpenses: latestExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: num(e.amount),
        date: e.date,
      })),
      latestDonations: latestDonations.map((d) => ({
        id: d.id,
        donor: d.donor_type === "anonymous" ? null : d.donor_name,
        donorType: d.donor_type,
        kind: d.kind,
        amount: d.amount == null ? null : num(d.amount),
        item: d.item,
        quantity: d.quantity,
        date: d.date,
      })),
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "تعذر تحميل لوحة التحكم" });
  }
};