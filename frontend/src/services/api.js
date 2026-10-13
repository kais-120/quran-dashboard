import { Axios } from "../api/Api";

// auth

export const login = (username,password) => Axios.post("/auth/login",{username,password})

// student 
export const getStudents = () =>  Axios.get("/student")
export const getStudentsWithoutGroup = () =>  Axios.get("/student/without-group")
export const getStudentsNotPaidCurrentMonth = () =>  Axios.get("/student/not-pay")
export const createStudent = (data) =>  Axios.post("/student",data)
export const updateStudent = (id,data) =>  Axios.put(`/student/${id}`,data)
export const deleteStudent = (id) =>  Axios.delete(`/student/${id}`)

// teachers
export const getTeachers = () =>  Axios.get("/teacher")
export const createTeacher = (data) =>  Axios.post("/teacher",data)
export const updateTeacher = (id,data) =>  Axios.put(`/teacher/${id}`,data)
export const deleteTeacher = (id) =>  Axios.delete(`/teacher/${id}`)

// Subscriptions
export const getSubscriptions = (query) =>  Axios.get(`/subscription?${query}`)
export const createSubscription = (data) =>  Axios.post("/subscription",data)
export const updateSubscription = (id,data) =>  Axios.put(`/subscription/${id}`,data)
export const deleteSubscription = (id) =>  Axios.delete(`/subscription/${id}`)

// Setting
export const getSetting = () =>  Axios.get(`/setting`)
export const updateSetting = (id,data) =>  Axios.put(`/setting/${id}`,data)


// group 
export const getGroups = () =>  Axios.get("/group")
export const createGroup = (data) =>  Axios.post("/group",data)
export const updateGroup = (id,data) =>  Axios.put(`/group/${id}`,data)
export const deleteGroup = (id) =>  Axios.delete(`/group/${id}`)
export const addStudentToGroup = (data) =>  Axios.put(`/student_group`,data)
export const removeStudentFromGroup = (id) =>  Axios.delete(`/student_group/${id}`)

// activities

export const getActivities = () => Axios.get('/activity');
export const createActivity = (data) => Axios.post('/activity', data);
export const updateActivity = (id, data) => Axios.put(`/activity/${id}`, data);
export const deleteActivity = (id) => Axios.delete(`/activity/${id}`);

// courses

export const getCourses = () => Axios.get('/course');
export const createCourse = (data) => Axios.post('/course', data);
export const updateCourse = (id, data) => Axios.put(`/course/${id}`, data);
export const deleteCourse = (id) => Axios.delete(`/course/${id}`);
export const getStudentsWithoutActiveCourse = (id) => Axios.get(`/course/without-active-course`);


// absences

export const getAbsences = () => Axios.get('/absence');
export const createAbsence = (data) => Axios.post('/absence', data);
export const updateAbsence = (id, data) => Axios.put(`/absence/${id}`, data);
export const deleteAbsence = (id) => Axios.delete(`/absence/${id}`);

// expenses

export const getExpenses = () => Axios.get('/expense');
export const createExpense = (data) => Axios.post('/expense', data);
export const updateExpense = (id, data) => Axios.put(`/expense/${id}`, data);
export const deleteExpense = (id) => Axios.delete(`/expense/${id}`);

// donations

export const getDonations = () => Axios.get('/donation');
export const createDonation = (data) => Axios.post('/donation', data);
export const updateDonation = (id, data) => Axios.put(`/donation/${id}`, data);
export const deleteDonation = (id) => Axios.delete(`/donation/${id}`);

// Dashboard

export const getDashboard = () => Axios.get('/dashboard');


export const getTeacherPayments = (query) => Axios.get(`/teacher-payment?${query}`);
export const createTeacherPayment = (data) => Axios.post('/teacher-payment', data);
export const updateTeacherPayment = (id, data) => Axios.put(`/teacher-payment/${id}`, data);
export const deleteTeacherPayment = (id) => Axios.delete(`/teacher-payment/${id}`);
export const notPaidCurrentMonth = () => Axios.get(`/teacher-payment/not-paid-current-month`);


