import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query"; // if you use v3, change to "react-query"
import { Axios, AxiosToken } from "../api/Api";
import Modal from "../components/Modal.jsx"; // adjust the path to where your Modal lives

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

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
  const key = String(status || "").toLowerCase();
  const s = STATUS[key];
  if (!s) return <span className="badge">{status || "—"}</span>;
  return <span className={"badge " + s.cls}>{s.label}</span>;
};

export default function BackupPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [restoring, setRestoring] = useState(null); // entry id, "upload", or null
  const [confirm, setConfirm] = useState(null); // modal state, see below
  const [toast, setToast] = useState("");
  const pollRef = useRef(null);
  const fileRef = useRef(null);

  /*
    confirm = null
      | { type: "restore-entry", entry, source }
      | { type: "restore-upload", file }
      | { type: "disconnect" }
  */

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        AxiosToken.get("/backup/status"),
        Axios.get("/backup/history"),
      ]);
      setStatus(statusRes.data);
      // make sure history is always an array
      const data = historyRes.data;
      setHistory(Array.isArray(data) ? data : data ? [data] : []);
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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = () => {
    stopPolling();
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await AxiosToken.get("/backup/status");
        if (res.data?.googleDriveConnected) {
          stopPolling();
          setStatus(res.data);
          setDriveBusy(false);
          showToast("تم ربط Google Drive بنجاح.");
          return;
        }
      } catch (err) {
        console.log(err);
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        setDriveBusy(false);
        showToast("انتهت مهلة ربط Google Drive، حاول مرة أخرى.");
      }
    }, POLL_MS);
  };

  const handleConnectDrive = async () => {
    setDriveBusy(true);
    try {
      const res = await AxiosToken.get("/backup/google/auth-url");
      window.open(res.data.url, "_blank");
      startPolling();
    } catch (err) {
      console.log(err);
      setDriveBusy(false);
      showToast("تعذر بدء ربط Google Drive.");
    }
  };

  const handleCancelConnect = () => {
    stopPolling();
    setDriveBusy(false);
  };

  const doDisconnectDrive = async () => {
    setDriveBusy(true);
    try {
      await AxiosToken.post("/backup/google/disconnect");
      showToast("تم فصل Google Drive.");
      await fetchData();
    } catch (err) {
      console.log(err);
      showToast("فشل فصل Google Drive.");
    } finally {
      setDriveBusy(false);
    }
  };

  const handleRunNow = async () => {
    setRunningBackup(true);
    try {
      await AxiosToken.post("/backup/run-now");
      showToast("تم إطلاق النسخ الاحتياطي بنجاح.");
      await fetchData();
    } catch (err) {
      console.log(err);
      showToast("فشل النسخ الاحتياطي، يرجى المحاولة مرة أخرى.");
    } finally {
      setRunningBackup(false);
    }
  };

  // ---------- Restore ----------

  // After a restore the whole database changed: refresh every cached query
  const refreshAfterRestore = async () => {
    await queryClient.invalidateQueries();
    await fetchData();
  };

  const doRestoreEntry = async (entry, source) => {
    setRestoring(entry.id);
    try {
      await AxiosToken.post(`/backup/restore/${entry.id}`, { source });
      showToast("تمت استعادة البيانات بنجاح.");
      await refreshAfterRestore();
    } catch (err) {
      console.log(err);
      showToast(err?.response?.data?.message || "فشلت استعادة البيانات.");
    } finally {
      setRestoring(null);
    }
  };

  const doRestoreUpload = async (file) => {
    setRestoring("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      await AxiosToken.post("/backup/restore/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("تمت استعادة البيانات من الملف بنجاح.");
      await refreshAfterRestore();
    } catch (err) {
      console.log(err);
      showToast(err?.response?.data?.message || "فشلت استعادة البيانات من الملف.");
    } finally {
      setRestoring(null);
    }
  };

  const handlePickFile = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) setConfirm({ type: "restore-upload", file });
  };

  // ---------- Confirm modal ----------

  const closeConfirm = () => setConfirm(null);

  const runConfirmed = () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.type === "restore-entry") doRestoreEntry(c.entry, c.source);
    else if (c.type === "restore-upload") doRestoreUpload(c.file);
    else if (c.type === "disconnect") doDisconnectDrive();
  };

  const renderConfirmBody = () => {
    if (!confirm) return null;

    if (confirm.type === "disconnect") {
      return <p style={{ margin: 0 }}>هل تريد فصل Google Drive؟</p>;
    }

    const detail =
      confirm.type === "restore-entry"
        ? [
            ["المصدر", confirm.source === "drive" ? "Google Drive" : "النسخة المحلية"],
            ["التاريخ", formatDateTime(confirm.entry.createdAt)],
          ]
        : [
            ["الملف", confirm.file.name],
            ["الحجم", formatSize(confirm.file.size)],
          ];

    return (
      <>
        <p style={{ margin: "0 0 12px", lineHeight: 1.7 }}>
          سيتم استبدال البيانات الحالية بالكامل ببيانات هذه النسخة. يتم إنشاء نسخة أمان
          تلقائيًا قبل الاستعادة، لكن هذا الإجراء لا يمكن التراجع عنه من الواجهة.
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {detail.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8 }}>
              <b>{k}:</b>
              <span className="num">{v}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const confirmTitle =
    confirm?.type === "disconnect" ? "فصل Google Drive" : "تأكيد استعادة البيانات";
  const confirmLabel = confirm?.type === "disconnect" ? "فصل" : "استعادة الآن";

  const driveOn = !!status?.googleDriveConnected;
  const restoreBusy = restoring !== null;

  return (
    <>
      <div className="page-head">
        <div className="welcome" style={{ marginBottom: 0 }}>
          <h1>النسخ الاحتياطي</h1>
          <p>حماية بيانات الجمعية وحفظها محليًا وعلى Google Drive</p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={fetchData} disabled={loading || restoreBusy}>
            ↻ تحديث
          </button>
          <button
            className="btn"
            onClick={handlePickFile}
            disabled={restoreBusy || runningBackup}
          >
            {restoring === "upload" ? "جارٍ الاستعادة..." : "استعادة من ملف"}
          </button>
          <button
            className="btn primary"
            onClick={handleRunNow}
            disabled={runningBackup || restoreBusy}
          >
            {runningBackup ? "جارٍ النسخ..." : "إنشاء نسخة الآن"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".sql,.dump,.backup,.gz,.zip"
            style={{ display: "none" }}
            onChange={handleFileChosen}
          />
        </div>
      </div>

      <section className="ledger" aria-label="ملخص النسخ الاحتياطي">
        <div>
          <b style={{ fontSize: 24 }}>
            <span className="num">{formatDateTime(status?.lastBackupAt)}</span>
          </b>
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
          <b><span className="num">{formatSize(status?.localTotalSize)}</span></b>
          <span>الحجم الإجمالي</span>
        </div>
        <div>
          <b>{driveOn ? "متصل" : "غير متصل"}</b>
          <span>
            Google Drive
            {driveOn
              ? ` — ${status?.googleEmail ? status.googleEmail + " — " : ""}آخر رفع ${formatDateTime(status?.lastDriveUploadAt)}`
              : " — اربط حسابك لرفع النسخ تلقائيًا"}
          </span>
          <div style={{ marginTop: 8 }}>
            {driveOn ? (
              <button
                className="btn danger"
                onClick={() => setConfirm({ type: "disconnect" })}
                disabled={driveBusy}
              >
                {driveBusy ? "..." : "فصل Google Drive"}
              </button>
            ) : driveBusy ? (
              <button className="btn" onClick={handleCancelConnect}>
                في انتظار الموافقة في المتصفح... (إلغاء)
              </button>
            ) : (
              <button className="btn primary" onClick={handleConnectDrive}>
                ربط Google Drive
              </button>
            )}
          </div>
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
                <th>استعادة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty">جارٍ التحميل...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">لا توجد نسخ احتياطية بعد.</td>
                </tr>
              ) : (
                history.map((entry) => {
                  const uploaded = entry.uploadedToDrive ?? entry.uploaded_to_drive;
                  const isSuccess = String(entry.status || "").toLowerCase() === "success";
                  const isThisRestoring = restoring === entry.id;
                  return (
                    <tr key={entry.id}>
                      <td><span className="num">{formatDateTime(entry.createdAt)}</span></td>
                      <td><span className="num">{formatSize(entry.size)}</span></td>
                      <td>
                        <span className="tag">محلي</span>
                        {uploaded && <span className="tag">Google Drive</span>}
                      </td>
                      <td><StatusBadge status={entry.status} /></td>
                      <td>
                        {isSuccess ? (
                          <div className="btn-row" style={{ marginTop: 0 }}>
                            <button
                              className="btn"
                              onClick={() =>
                                setConfirm({ type: "restore-entry", entry, source: "local" })
                              }
                              disabled={restoreBusy || runningBackup}
                            >
                              {isThisRestoring ? "جارٍ الاستعادة..." : "استعادة"}
                            </button>
                            {uploaded && driveOn && (
                              <button
                                className="btn"
                                onClick={() =>
                                  setConfirm({ type: "restore-entry", entry, source: "drive" })
                                }
                                disabled={restoreBusy || runningBackup}
                              >
                                من Drive
                              </button>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirm && (
        <Modal title={confirmTitle} onClose={closeConfirm}>
          <div style={{ padding: "16px 20px" }}>{renderConfirmBody()}</div>
          <div
            className="btn-row"
            style={{ padding: "0 20px 16px", marginTop: 0, justifyContent: "flex-start" }}
          >
            <button className="btn danger" onClick={runConfirmed}>
              {confirmLabel}
            </button>
            <button className="btn" onClick={closeConfirm}>
              إلغاء
            </button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}