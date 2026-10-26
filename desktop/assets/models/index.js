const Absence = require("./Absence");
const CompetitionScore = require("./CompetitionScore");
const Course = require("./Course");
const CourseStudent = require("./CourseStudent");
const Group = require("./Group");
const Student = require("./Student");
const StudentGroup = require("./StudentGroup");
const Subscription = require("./Subscription");
const SubscriptionPayment = require("./SubscriptionPayment");
const Teacher = require("./Teacher");
const TeacherPayment = require("./TeacherPayment");

Teacher.hasMany(Group, {
  foreignKey: "head_teacher_id",
  as: "headedGroups",
});

Group.belongsTo(Teacher, {
  foreignKey: "head_teacher_id",
  as: "headTeacher",
});

Student.hasMany(StudentGroup, {
  foreignKey: "student_id",
  as: "studentGroups",
});

StudentGroup.belongsTo(Student, {
  foreignKey: "student_id",
  as: "students",
});

Group.hasMany(StudentGroup, {
  foreignKey: "group_id",
  as: "studentGroup",
});

StudentGroup.belongsTo(Group, {
  foreignKey: "group_id",
  as: "group",
});

Student.hasMany(Subscription, {
  foreignKey: "student_id",
  as: "subscriptions",
});

Subscription.belongsTo(Student, {
  foreignKey: "student_id",
  as: "student",
});

Subscription.hasMany(SubscriptionPayment, {
  foreignKey: "subscription_id",
  as: "payments",
});

SubscriptionPayment.belongsTo(Subscription, {
  foreignKey: "subscription_id",
  as: "subscription",
});

Course.belongsToMany(Student, {
  through: CourseStudent,
  foreignKey: "course_id",
  otherKey: "student_id",
  as: "students",
});

Student.belongsToMany(Course, {
  through: CourseStudent,
  foreignKey: "student_id",
  otherKey: "course_id",
  as: "courses",
});

Student.hasMany(Absence, {
  foreignKey: "student_id",
  as: "absence",
});

Absence.belongsTo(Student, {
  foreignKey: "student_id",
  as: "students",
});


Teacher.hasMany(TeacherPayment, {
  foreignKey: "teacher_id",
  as: "payments",
});

TeacherPayment.belongsTo(Teacher, {
  foreignKey: "teacher_id",
  as: "teacher",
});

CompetitionScore.belongsTo(Group, { foreignKey: 'group_id', as: 'group', onDelete: 'CASCADE' });
CompetitionScore.belongsTo(Student, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
Group.hasMany(CompetitionScore, { foreignKey: 'group_id', as: 'competitionScores' });
Student.hasMany(CompetitionScore, { foreignKey: 'student_id', as: 'competitionScores' });


module.exports = {
  Teacher,
  Group,
  Student,
  StudentGroup,
  Subscription,
  SubscriptionPayment,
  CourseStudent,
  Course,
  TeacherPayment,
  CompetitionScore
};