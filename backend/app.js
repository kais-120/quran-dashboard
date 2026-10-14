const express = require("express");
const router = express.Router();
const AuthRouter = require("./routes/AuthRouters")
const StudentRoute = require("./routes/StudentRoutes")
const TeacherRoutes = require("./routes/TeacherRoutes")
const SettingRoutes = require("./routes/SettingRoutes")
const StudentGroupRoutes = require("./routes/StudentGroupRoutes")
const GroupRoutes = require("./routes/GroupRoutes")
const AbsenceRoutes = require("./routes/AbsenceRoutes")
const ActivityRoutes = require("./routes/ActivityRoutes")
const CourseRoutes = require("./routes/CourseRoutes")
const DonationRoutes = require("./routes/DonationRoutes")
const ExpenseRoutes = require("./routes/ExpenseRoutes")
const SubscriptionRoutes = require("./routes/SubscriptionRoutes")
const DashboardRoutes = require("./routes/DashboardRoutes")
const TeacherPaymentRoutes = require("./routes/TeacherPaymentRoutes")
const UserRoutes = require("./routes/UserRoutes")
const BackupRoute = require("./routes/BackupRoute")





router.use("/auth",AuthRouter);
router.use("/student",StudentRoute);
router.use("/teacher",TeacherRoutes);
router.use("/setting", SettingRoutes);
router.use("/group", GroupRoutes);
router.use("/student_group", StudentGroupRoutes);
router.use("/absence", AbsenceRoutes);
router.use("/activity", ActivityRoutes);
router.use("/course", CourseRoutes);
router.use("/donation", DonationRoutes);
router.use("/expense", ExpenseRoutes);
router.use("/subscription", SubscriptionRoutes);
router.use("/dashboard", DashboardRoutes);
router.use("/teacher-payment", TeacherPaymentRoutes);
router.use("/user", UserRoutes);
router.use("/backup", BackupRoute);





module.exports = router