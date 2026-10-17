import { useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import Field from '../components/Field.jsx';
import PageHead from '../components/PageHead.jsx';
import Icon from '../components/Icon.jsx';
import {
  getGroups,
  getCompetitionScores,
  saveCompetitionScores,
  addCompetitionStranger,
  removeCompetitionStranger,
  getCompetitionGroup,
} from '../services/api.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '../components/ConfirmModal.jsx';

const MAX_SCORE = 100;
const same = (a, b) => String(a ?? '') === String(b ?? '');
const errMsg = (err) => err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع';

// Always returns an array, whatever the API sends back
const toArray = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.scores)) return d.scores;
  return [];
};

const THIS_YEAR = new Date().getFullYear();
const START_YEAR = 2026; // year the app launches
// Newest first: from the current year back to the launch year
const YEARS = Array.from(
  { length: Math.max(1, THIS_YEAR - START_YEAR + 1) },
  (_, i) => THIS_YEAR - i
);

// A competitor is a membership row (student_group): works for students and strangers
const memberIdOf = (sg) => sg.id;
const isStranger = (sg) => sg.type === 'stranger';
const memberNameOf = (sg) =>
  (isStranger(sg) ? sg.name : sg.students?.name) || '—';

// Returns every entry sharing the highest score (handles ties)
const topOf = (entries) => {
  if (!entries.length) return [];
  const max = Math.max(...entries.map((e) => e.score));
  return entries.filter((e) => e.score === max);
};

export default function Competitions() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(THIS_YEAR);
  const [q, setQ] = useState('');
  const [scoring, setScoring] = useState(null); // { group_id, values: { [studentGroupId]: string } }
  const [showResults, setShowResults] = useState(false);
  const [strangerName, setStrangerName] = useState('');
  const [toDelete, setToDelete] = useState(null);


  // ---------- Queries ----------
  const { data: groupsRaw } = useQuery({
    queryKey: ['groups',year],
    queryFn: async () => toArray((await getCompetitionGroup(year)).data),
  });
  const groups = toArray(groupsRaw);

  // [{ year, group_id, student_group_id, score }]
  const { data: scoresRaw } = useQuery({
    queryKey: ['competition', year],
    queryFn: async () => toArray((await getCompetitionScores(year)).data),
  });
  const scores = toArray(scoresRaw);

  // ---------- Mutations ----------
  const saveMutation = useMutation({
    mutationFn: (payload) => saveCompetitionScores(payload),
    onSuccess: () => {
      setScoring(null);
      queryClient.invalidateQueries({ queryKey: ['competition', year] });
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const addStrangerMutation = useMutation({
    mutationFn: (payload) => addCompetitionStranger(payload),
    onSuccess: () => {
      setStrangerName('');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  const removeStrangerMutation = useMutation({
    mutationFn: (id) => removeCompetitionStranger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['competition'] });
      setToDelete(null)
    },
    onError: (err) => window.alert(errMsg(err)),
  });

  // ---------- Derived ----------
  const scoreByMember = useMemo(() => {
    const m = new Map();
    scores.forEach((s) => m.set(String(s.student_group_id), Number(s.score)));
    return m;
  }, [scores]);

  // per-group entries (members that have a score this year)
  const groupData = useMemo(
    () =>
      groups.map((g) => {
        const members = g.studentGroup || [];
        const entries = members
          .map((sg) => ({
            id: memberIdOf(sg),
            name: memberNameOf(sg),
            stranger: isStranger(sg),
            score: scoreByMember.get(String(memberIdOf(sg))),
            group: g.label,
          }))
          .filter((e) => e.score !== undefined)
          .sort((a, b) => b.score - a.score);
        return { group: g, total: members.length, entries, top: topOf(entries) };
      }),
    [groups, scoreByMember]
  );

  const overallRanking = useMemo(
    () => groupData.flatMap((d) => d.entries).sort((a, b) => b.score - a.score),
    [groupData]
  );
  const overallTop = useMemo(() => topOf(overallRanking), [overallRanking]);

  const list = useMemo(
    () => groupData.filter((d) => !q || (d.group.label || '').includes(q.trim())),
    [groupData, q]
  );

  const scoringGroup = scoring ? groups.find((g) => same(g.id, scoring.group_id)) : null;
  const scoringMembers = scoringGroup?.studentGroup || [];

  // ---------- Handlers ----------
  const valuesFor = (groupId) => {
    const g = groups.find((x) => same(x.id, groupId));
    const values = {};
    (g?.studentGroup || []).forEach((sg) => {
      const s = scoreByMember.get(String(memberIdOf(sg)));
      values[memberIdOf(sg)] = s === undefined ? '' : String(s);
    });
    return values;
  };

  const openScoring = (groupId = '') => {
    setStrangerName('');
    setScoring({ group_id: groupId, values: groupId ? valuesFor(groupId) : {} });
  };

  const changeGroup = (groupId) => {
    setStrangerName('');
    setScoring({ group_id: groupId, values: groupId ? valuesFor(groupId) : {} });
  };

  const changeScore = (memberId, value) =>
    setScoring((s) => ({ ...s, values: { ...s.values, [memberId]: value } }));

  const invalidValue = (v) => {
    if (v === '') return false;
    const n = Number(v);
    return Number.isNaN(n) || n < 0 || n > MAX_SCORE;
  };

  const hasInvalid = scoring ? Object.values(scoring.values).some(invalidValue) : false;

  const addStranger = () => {
    const name = strangerName.trim();
    if (!scoringGroup || !name || addStrangerMutation.isPending) return;
    addStrangerMutation.mutate({ group_id: scoringGroup.id, name });
  };

  const removeStranger = (sg) => {
    // if (!window.confirm(`حذف ${memberNameOf(sg)} من الفوج؟`)) return;
    setToDelete(sg)
    // removeStrangerMutation.mutate(sg.id);
  };

  const saveScores = () => {
    if (!scoringGroup || hasInvalid) return;
    // only current members (a removed stranger must not be sent)
    const currentIds = new Set(scoringMembers.map((m) => String(memberIdOf(m))));
    const payload = Object.entries(scoring.values)
      .filter(([id, v]) => v !== '' && currentIds.has(String(id)))
      .map(([student_group_id, v]) => ({ student_group_id, score: Number(v) }));
    saveMutation.mutate({ year, group_id: scoringGroup.id, scores: payload });
  };

  return (
    <>
      <PageHead
        title="المسابقة السنوية"
        subtitle="مسابقة بين المشاركين في الفوج الواحد، مع ترتيب الأوائل في كل فوج وعلى مستوى الجميع."
        action={
          <div className="head-actions">
            <button className="btn" onClick={() => setShowResults(true)}>
              <Icon name="search" /> النتائج
            </button>
            <button className="btn primary" onClick={() => openScoring()}>
              <Icon name="plus" /> إدخال النقاط
            </button>
          </div>
        }
      />

      <div className="toolbar add-stranger">
        <div className="search">
          <Icon name="search" />
          <input placeholder="ابحث باسم الفوج" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="السنة">
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الفوج</th>
              <th>المعلم المسؤول</th>
              <th>المشاركون المقيَّمون</th>
              <th>الأول في الفوج</th>
              <th>النقطة</th>
              <th className="actions-col"><span className="sr">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ group: g, total, entries, top }) => (
              <tr key={g.id}>
                <td className="strong">{g.label}</td>
                <td>{g.headTeacher ? `${g.headTeacher.first_name} ${g.headTeacher.last_name}` : '—'}</td>
                <td><span className="tag">{entries.length} / {total}</span></td>
                <td>{top.length ? top.map((t) => t.name).join('، ') : '—'}</td>
                <td><span className="num">{top.length ? top[0].score : '—'}</span></td>
                <td className="actions">
                  <button className="btn" onClick={() => openScoring(g.id)}>
                    <Icon name="edit" /> النقاط
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="6" className="empty">
                {groups.length ? 'لا توجد نتائج مطابقة.' : 'لم تتم إضافة أي فوج بعد.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Scores modal ---------- */}
      {scoring && (
        <Modal wide title={`إدخال نقاط مسابقة ${year}`} onClose={() => setScoring(null)}>
          <div className="form-grid">
            <Field label="الفوج" wide>
              <select value={scoring.group_id} onChange={(e) => changeGroup(e.target.value)}>
                <option value="">اختر الفوج</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {scoringGroup && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Icon name="plus" />
                  <input
                    placeholder="إضافة مشارك من خارج المدرسة (الاسم واللقب)"
                    value={strangerName}
                    onChange={(e) => setStrangerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addStranger();
                      }
                    }}
                  />
                </div>
                <button
                style={{marginLeft:25}}
                  type="button"
                  className="btn"
                  onClick={addStranger}
                  disabled={!strangerName.trim() || addStrangerMutation.isPending}
                >
                  إضافة
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم واللقب</th>
                      <th>النقطة (من {MAX_SCORE})</th>
                      <th className="actions-col"><span className="sr">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoringMembers.map((sg) => {
                      const id = memberIdOf(sg);
                      const v = scoring.values[id] ?? '';
                      return (
                        <tr key={sg.id}>
                          <td className="strong">
                            {memberNameOf(sg)}
                            {isStranger(sg) && <span className="tag outside"> من خارج المدرسة</span>}
                          </td>
                          <td>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={MAX_SCORE}
                              step="any"
                              value={v}
                              onChange={(e) => changeScore(id, e.target.value)}
                              aria-label={`نقطة ${memberNameOf(sg)}`}
                            />
                            {invalidValue(v) && (
                              <small className="error">القيمة بين 0 و {MAX_SCORE}</small>
                            )}
                          </td>
                          <td className="actions">
                            {isStranger(sg) && (
                              <button
                                type="button"
                                className="btn icon-btn danger"
                                onClick={() => removeStranger(sg)}
                                disabled={removeStrangerMutation.isPending}
                                aria-label={`حذف ${memberNameOf(sg)}`}
                              >
                                <Icon name="trash" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {scoringMembers.length === 0 && (
                      <tr><td colSpan="3" className="empty">لا يوجد مشاركون في هذا الفوج.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setScoring(null)}>إلغاء</button>
            <button
              type="button"
              className="btn primary"
              onClick={saveScores}
              disabled={!scoringGroup || hasInvalid || saveMutation.isPending}
            >
              حفظ
            </button>
          </div>
        </Modal>
      )}

      {toDelete && (
              <ConfirmModal
                title="حذف مشارك من خارج المدرسة"
                message={`حذف ${memberNameOf(toDelete)} من الفوج؟`}
                confirmText="حذف"
                danger
                onClose={() => setToDelete(null)}
                onConfirm={() => removeStrangerMutation.mutate(toDelete.id)}
              />
            )}

      {/* ---------- Results modal ---------- */}
      {showResults && (
        <Modal wide title={`نتائج مسابقة ${year}`} onClose={() => setShowResults(false)}>
          <h4>الأول على الجميع</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم واللقب</th>
                  <th>الفوج</th>
                  <th>النقطة</th>
                </tr>
              </thead>
              <tbody>
                {overallTop.map((t) => (
                  <tr key={`${t.group}-${t.id}`}>
                    <td className="strong">
                      {t.name}
                      {t.stranger && <span className="tag"> من خارج المدرسة</span>}
                    </td>
                    <td>{t.group}</td>
                    <td><span className="num">{t.score}</span></td>
                  </tr>
                ))}
                {overallTop.length === 0 && (
                  <tr><td colSpan="3" className="empty">لا توجد نقاط مدخلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h4>الأول في كل فوج</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الفوج</th>
                  <th>الأول</th>
                  <th>النقطة</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map(({ group: g, top }) => (
                  <tr key={g.id}>
                    <td className="strong">{g.label}</td>
                    <td>{top.length ? top.map((t) => t.name).join('، ') : '—'}</td>
                    <td><span className="num">{top.length ? top[0].score : '—'}</span></td>
                  </tr>
                ))}
                {groupData.length === 0 && (
                  <tr><td colSpan="3" className="empty">لا توجد أفواج.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h4>الترتيب العام (أفضل 10)</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم واللقب</th>
                  <th>الفوج</th>
                  <th>النقطة</th>
                </tr>
              </thead>
              <tbody>
                {overallRanking.slice(0, 10).map((e, i) => (
                  <tr key={`${e.group}-${e.id}`}>
                    <td><span className="num">{i + 1}</span></td>
                    <td className="strong">
                      {e.name}
                      {e.stranger && <span className="tag"> من خارج المدرسة</span>}
                    </td>
                    <td>{e.group}</td>
                    <td><span className="num">{e.score}</span></td>
                  </tr>
                ))}
                {overallRanking.length === 0 && (
                  <tr><td colSpan="4" className="empty">لا توجد نقاط مدخلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setShowResults(false)}>إغلاق</button>
          </div>
        </Modal>
      )}
    </>
  );
}