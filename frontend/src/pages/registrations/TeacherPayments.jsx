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
import { fmtDate, money } from "../../utils.js";
// NOTE: adjust these names to match your real API layer
import {
  getTeacherPayments,
  createTeacherPayment,
  updateTeacherPayment,
  deleteTeacherPayment,
  getTeachers,
  notPaidCurrentMonth,
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
  teacher_id: "",
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

const schema = Yup.object({
  teacher_id: Yup.string().required("اختر المعلّم"),
  date: Yup.date().typeError("تاريخ غير صالح").required("تاريخ الدفع مطلوب"),
  amount: Yup.number()
    .typeError("أدخل رقمًا صالحًا")
    .required("المبلغ مطلوب")
    .min(0, "المبلغ لا يمكن أن يكون سالبًا"),
});

const FieldError = ({ formik, name }) =>
  formik.touched[name] && formik.errors[name] ? (
    <small style={{ color: "#d33", display: "block", marginTop: 4 }}>
      {formik.errors[name]}
    </small>
  ) : null;

function PaymentForm({
  initialValues,
  teachers,
  onSubmit,
  onCancel,
  submitting,
}) {
  const isEdit = !!initialValues.id;

  const formik = useFormik({
    initialValues,
    validationSchema: schema,
    onSubmit: (values) => {
      const { id, amount, ...rest } = values;
      onSubmit({ id, payload: { ...rest, amount: Number(amount) } });
    },
  });

  const selected = teachers.find(
    (t) => String(t.id) === String(formik.values.teacher_id),
  );

  // pre-fill the amount with the teacher's salary when picking a teacher
  const onTeacherChange = (e) => {
    formik.handleChange(e);
    if (isEdit) return;
    const t = teachers.find((x) => String(x.id) === e.target.value);
    formik.setFieldValue("amount", t?.salary ?? "");
  };

  return (
    <form onSubmit={formik.handleSubmit} className="form-grid" noValidate>
      <Field label="المعلّم" wide>
        <select
          name="teacher_id"
          value={formik.values.teacher_id}
          onChange={onTeacherChange}
          onBlur={formik.handleBlur}
          disabled={isEdit}
        >
          <option value="">اختر المعلّم</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.first_name + " " + t.last_name}
            </option>
          ))}
        </select>
        <FieldError formik={formik} name="teacher_id" />
      </Field>

      <Field label="تاريخ الدفع">
        <input
          type="date"
          name="date"
          value={formik.values.date}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        <FieldError formik={formik} name="date" />
      </Field>

      <Field label="المبلغ المدفوع">
        <input
          type="number"
          name="amount"
          min="0"
          step="any"
          value={formik.values.amount}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        <FieldError formik={formik} name="amount" />
      </Field>

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

function TeacherPayments() {
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
    queryKey: ["teacher-payments", params],
    queryFn: async () => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== "" && v != null),
      ).toString();
      const res = await getTeacherPayments(qs);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["notPaidCurrentMonth", "all"],
    queryFn: async () => {
      const res = await notPaidCurrentMonth();
      return res.data.teachers ?? res.data;
    },
  });

  const rows = data?.payments ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, totalPages: 1 };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["teacher-payments"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateTeacherPayment(id, payload) : createTeacherPayment(payload),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTeacherPayment(id),
    onSuccess: invalidate,
    onError: (err) => window.alert(errMsg(err)),
  });

  const openNew = () => setEditing(emptyForm());

  const openEdit = (row) =>
    setEditing({
      id: row.id,
      teacher_id: String(row.teacher_id ?? row.teacher?.id ?? ""),
      date: row.date ? String(row.date).slice(0, 10) : today(),
      amount: row.amount ?? "",
    });

  const del = (row) => {
    if (window.confirm(`حذف دفعة «${row.teacher?.name || ""}»؟`))
      deleteMutation.mutate(row.id);
  };

  const totalAmount = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);

  // paid in full vs partial, compared to the teacher's salary
  const statusOf = (r) =>
    Number(r.amount) >= Number(r.teacher?.salary ?? 0) ? "pay" : "partial";

  return (
    <>
      <PageHead
        title="دفعات المعلّمين"
        subtitle="متابعة أجور المعلّمين ودفعاتهم الشهرية."
        action={
          <button
            className="btn primary"
            onClick={openNew}
            disabled={teachers.length === 0}
            title={teachers.length === 0 ? "أضف معلّمين أولًا" : ""}
          >
            <Icon name="plus" /> دفع جديد
          </button>
        }
      />

      <div className="toolbar_sub">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="ابحث باسم المعلّم"
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
              <th>المعلّم</th>
              <th>الهاتف</th>
              <th>تاريخ الدفع</th>
              <th>المبلغ</th>
              <th className="actions-col">
                <span className="sr">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="empty">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((r) => {
                return (
                  <tr key={r.id}>
                    <td className="strong">{r.teacher?.first_name + " " + r.teacher?.last_name || "—"}</td>
                    <td>
                      <span className="num" dir="ltr">
                        {r.teacher?.phone || "—"}
                      </span>
                    </td>
                    <td>{r.date_payment ? new Date(r.date_payment).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className="num">{money(r.amount, CURRENCY)}</span>
                    </td>
                    <td className="actions">
                      <button
                        className="icon-btn"
                        onClick={() => openEdit(r)}
                        aria-label="تعديل الدفعة"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => del(r)}
                        disabled={deleteMutation.isPending}
                        aria-label="حذف الدفعة"
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan="3" className="empty">
                  لا توجد دفعات مطابقة. غيّر التصفية.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="5">مجموع الصفحة</td>
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
          title={editing.id ? "تعديل الدفعة" : "دفعة جديدة"}
          onClose={() => setEditing(null)}
        >
          <PaymentForm
            initialValues={editing}
            teachers={teachers}
            submitting={saveMutation.isPending}
            onSubmit={(vars) => saveMutation.mutate(vars)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}

export default TeacherPayments;