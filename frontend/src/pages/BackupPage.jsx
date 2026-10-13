import { useState, useEffect, useCallback } from "react";
import { Axios } from "../api/Api";

// Formats bytes into a readable label
const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "—";
  const units = ["بايت", "ك.ب", "م.ب", "غ.ب"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS = {
  success: { label: "ناجحة", cls: "paid" },
  running: { label: "جارية", cls: "partial" },
  error: { label: "فاشلة", cls: "unpaid" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.success;
  return <span className={"badge " + s.cls}>{s.label}</span>;
};

export default function BackupPage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        Axios.get("/backup/status"),
        Axios.get("/backup/history"),
      ]);
      setStatus(statusRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.log(err);
      showToast("خطأ أثناء تحميل معلومات النسخ الاحتياطي.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunNow = async () => {
    setRunningBackup(true);
    try {
      await Axios.post("/backup/run-now");
      showToast("تم إطلاق النسخ الاحتياطي بنجاح.");
      await fetchData();
    } catch (err) {
      console.log(err);
      showToast("فشل النسخ الاحتياطي، يرجى المحاولة مرة أخرى.");
    } finally {
      setRunningBackup(false);
    }
  };

  const driveOn = !!status?.googleDriveConnected;

  return (
    <>
      <div className="page-head">
        <div className="welcome" style={{ marginBottom: 0 }}>
          <h1>النسخ الاحتياطي</h1>
          <p>حماية بيانات الجمعية وحفظها محليًا وعلى Google Drive</p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={fetchData} disabled={loading}>
            ↻ تحديث
          </button>
          <button className="btn primary" onClick={handleRunNow} disabled={runningBackup}>
            {runningBackup ? "جارٍ النسخ..." : "إنشاء نسخة الآن"}
          </button>
        </div>
      </div>

      <section className="ledger" aria-label="ملخص النسخ الاحتياطي">
        <div>
          <b className="num" style={{ fontSize: 24 }}>{formatDateTime(status?.lastBackupAt)}</b>
          <span>آخر نسخة احتياطية</span>
          {status?.lastBackupStatus && (
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={status.lastBackupStatus} />
            </div>
          )}
        </div>
        <div>
          <b>{status?.localCount ?? 0}</b>
          <span>ملف محلي (يُحتفظ بـ {status?.retentionCount ?? 30})</span>
        </div>
        <div>
          <b className="num">{formatSize(status?.localTotalSize)}</b>
          <span>الحجم الإجمالي</span>
        </div>
        <div>
          <b>{driveOn ? "متصل" : "غير متصل"}</b>
          <span>
            Google Drive
            {driveOn
              ? ` — آخر رفع ${formatDateTime(status?.lastDriveUploadAt)}`
              : " — المصادقة مطلوبة"}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>سجل النسخ الاحتياطية</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحجم</th>
                <th>الموضع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="empty">جارٍ التحميل...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">لا توجد نسخ احتياطية بعد.</td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="num">{formatDateTime(entry.createdAt)}</td>
                    <td className="num">{formatSize(entry.size)}</td>
                    <td>
                      <span className="tag">محلي</span>{" "}
                      {entry.uploadedToDrive && <span className="tag">Google Drive</span>}
                    </td>
                    <td>
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}