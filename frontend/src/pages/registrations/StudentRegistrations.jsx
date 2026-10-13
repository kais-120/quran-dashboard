import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useFormik } from "formik";
import * as Yup from "yup";
import Modal from "../../components/Modal.jsx";
import Field from "../../components/Field.jsx";
import PageHead from "../../components/PageHead.jsx";
import Icon from "../../components/Icon.jsx";
import { money } from "../../utils.js";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSetting,
  getStudentsNotPaidCurrentMonth,
} from "../../services/api.js";

const LIMIT = 10;
const CURRENCY = "د.ت";

const MONTHS = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  student_id: "",
  date: today(),
  amount: "",
});

function useDebounced(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const errMsg = (err) =>
  err?.response?.data?.message || "حدث خطأ، حاول مرة أخرى.";

const buildSchema = (isEdit, fee) =>
  Yup.object({
    student_id: Yup.string().required("اختر التلميذ"),
    date: Yup.date()
      .typeError("تاريخ غير صالح")
      .required("تاريخ التسجيل مطلوب"),
    amount: isEdit
      ? Yup.mixed()
      : Yup.number()
          .transform((value, original) =>
            original === "" || original == null ? undefined : value,
          )
          .typeError("أدخل رقمًا صالحًا")
          .min(0, "المبلغ لا يمكن أن يكون سالبًا")
          .test(
            "max-fee",
            "المبلغ المدفوع أكبر من الرسوم",
            (v) => v == null || !fee || v <= Number(fee),
          ),
  });

const FieldError = ({ formik, name }) =>
  formik.touched[name] && formik.errors[name] ? (
    <small style={{ color: "#d33", display: "block", marginTop: 4 }}>
      {formik.errors[name]}
    </small>
  ) : null;

function RegistrationForm({
  initialValues,
  students,
  fee,
  studentName,
  onSubmit,
  onCancel,
  submitting,
}) {
  const isEdit = !!initialValues.id;

  const formik = useFormik({
    initialValues,
    validationSchema: buildSchema(isEdit, fee),
    onSubmit: (values) => {
      const { id, amount, ...rest } = values;
      const payload = { ...rest };
      if (!isEdit && amount !== "" && amount != null) {
        payload.amount = Number(amount);
      }
      onSubmit({ id, payload });
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="التلميذ" wide>
        <select
          name="student_id"
          value={formik.values.student_id}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={isEdit}
        >
          <option value="">اختر التلميذ</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {studentName(s)}
            </option>
          ))}
        </select>
        <FieldError formik={formik} name="student_id" />
      </Field>

      <Field label="تاريخ التسجيل">
        <input
          type="date"
          name="date"
          value={formik.values.date}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        <FieldError formik={formik} name="date" />
      </Field>

      <Field label="الرسوم">
        <input type="number" value={fee ?? ""} disabled readOnly />
      </Field>

      {!isEdit && (
        <Field label="المبلغ المدفوع">
          <input
            type="number"
            name="amount"
            min="0"
            max={fee || undefined}
            step="any"
            value={formik.values.amount}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          <FieldError formik={formik} name="amount" />
        </Field>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          إلغاء
        </button>
        <button
          type="submit"
          className="btn primary"
          disabled={submitting || formik.isSubmitting}
        >
          حفظ
        </button>
      </div>
    </form>
  );
}

function StudentRegistrations() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);

  const name = useDebounced(q.trim());

  // reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [name, year, month]);

  const params = { page, limit: LIMIT, name, year, month };

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["subscriptions", params],
    queryFn: async () => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== "" && v != null),
      ).toString();
      const res = await getSubscriptions(qs);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students", "all"],
    queryFn: async () => {
      const res = await getStudentsNotPaidCurrentMonth();
      return res.data.students ?? res.data;
    },
  });

  const { data: setting = {} } = useQuery({
    queryKey: ["setting"],
    queryFn: async () => {
      const res = await getSetting();
      return res.data;
    },
  });

  const rows = data?.subscriptions ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, totalPages: 1 };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateSubscription(id, payload) : createSubscription(payload),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSubscription(id),
    onSuccess: invalidate,
    onError: (err) => window.alert(errMsg(err)),
  });

  const studentName = (st) =>
    st ? `${st.name || ""}`.trim() : "—";

  const openNew = () => setEditing(emptyForm());

  const openEdit = (row) => {
    const sub = row.subscription;
    setEditing({
      id: sub.id,
      student_id: String(sub.student_id ?? ""),
      date: sub.date ? String(sub.date).slice(0, 10) : today(),
      amount: "",
    });
  };

  const del = (row) => {
    const sub = row.subscription;
    if (window.confirm(`حذف اشتراك «${studentName(sub?.student)}»؟`))
      deleteMutation.mutate(sub.id);
  };

  const totalAmount = rows.reduce(
    (a, r) => a + Number(r.amount ?? r.subscription?.amount ?? 0),
    0,
  );

  return (
    <>
      <PageHead
        title="الاشتراكات"
        subtitle="اشتراكات التلاميذ ومتابعة دفعاتهم الشهرية."
        action={
          <button
            className="btn primary"
            onClick={openNew}
            disabled={students.length === 0}
            title={students.length === 0 ? "أضف تلاميذ أولًا" : ""}
          >
            <Icon name="plus" /> دفع جديد
          </button>
        }
      />

      <div className="toolbar_sub">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="ابحث باسم التلميذ"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="السنة"
          aria-label="السنة"
          dir="ltr"
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="الشهر"
        >
          <option value="">كل الشهور</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {isError && <div className="empty">{errMsg(error)}</div>}

      <div
        className="table-wrap"
        style={{ opacity: isFetching && !isLoading ? 0.6 : 1 }}
      >
        <table>
          <thead>
            <tr>
              <th>التلميذ</th>
             <th>اسم الولي</th>
              <th>تاريخ الدفع</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th className="actions-col">
                <span className="sr">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="7" className="empty">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((r) => {
                const sub = r.subscription;
                const st = r.status || sub?.status;
                return (
                  <tr key={r.id}>
                    <td className="strong">{studentName(sub?.student)}</td>
                    <td className="strong">{sub?.student?.father_name || "—"}</td>
                    <td>
                      <span className="num">{r?.date_payment ? new Date(r.date_payment).toLocaleDateString() : ""}</span>
                    </td>
                    <td>
                      <span className="num">
                        {money(r.amount ?? sub?.amount, CURRENCY)}
                      </span>
                    </td>
                    <td>
                      <span className={"badge " + st}>{st === "pay" ? "مدفوع" : "جزئي"}</span>
                    </td>
                    <td className="actions">
                      <button
                        className="icon-btn"
                        onClick={() => openEdit(r)}
                        aria-label="تعديل الاشتراك"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => del(r)}
                        disabled={deleteMutation.isPending}
                        aria-label="حذف الاشتراك"
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan="7" className="empty">
                  لا توجد اشتراكات مطابقة. غيّر التصفية.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="4">مجموع الصفحة</td>
                <td>
                  <span className="num">{money(totalAmount, CURRENCY)}</span>
                </td>
                <td colSpan="2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            السابق
          </button>
          <span className="num">
            {page} / {pagination.totalPages} ({pagination.total})
          </span>
          <button
            className="btn"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
          >
            التالي
          </button>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? "تعديل التسجيل" : "تسجيل جديد"}
          onClose={() => setEditing(null)}
        >
          <RegistrationForm
            initialValues={editing}
            students={students}
            fee={setting.default_fee}
            studentName={studentName}
            submitting={saveMutation.isPending}
            onSubmit={(vars) => saveMutation.mutate(vars)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}

export default StudentRegistrations;