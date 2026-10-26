
const express = require("express");
const router = express.Router();

const {
  createTeacherPayment,
  getAllTeacherPayments,
  getTeacherPaymentById,
  updateTeacherPayment,
  deleteTeacherPayment,
  getTeachersNotPaidCurrentMonth,
} = require("../controllers/TeacherPaymentController");

const {
  teacherPaymentValidator,
  listTeacherPaymentsValidator,
} = require("../validators/TeacherPaymentValidator");

router
  .route("/")
  .post(teacherPaymentValidator, createTeacherPayment)
  .get(getAllTeacherPayments);

    router.get(
  "/not-paid-current-month",
  getTeachersNotPaidCurrentMonth
);

router
  .route("/:id")
  .get(listTeacherPaymentsValidator,getTeacherPaymentById)
  .put(teacherPaymentValidator, updateTeacherPayment)
  .delete( deleteTeacherPayment);



module.exports = router;
