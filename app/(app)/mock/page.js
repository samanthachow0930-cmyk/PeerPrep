'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { buildCalendar, fmtTime } from '@/lib/mockSlots';
import { useRules } from '@/lib/useRules';

const INFO = {
  '1to1': { label: '1-to-1', text: 'Two students swap interviewer and interviewee roles halfway.' },
  group: { label: 'Group (3–4 people)', text: 'A group of 3 to 4 students rotates roles.' },
};
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Mock() {
  const { profile, refresh } = useApp();
  const rules = useRules();
  const [format, setFormat] = useState('1to1');
  const [picked, setPicked] = useState(new Set());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const calendar = useMemo(() => buildCalendar(14), []);
  const [selKey, setSelKey] = useState(() => calendar.find((d) => d.slots.length)?.key || null);

  useEffect(() => { supabase.rpc('settle_sessions').then(() => refresh()); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    setPicked(new Set());
    supabase.from('mock_availability').select('slot_start')
      .eq('user_id', profile.id).eq('format', format).gt('slot_start', new Date().toISOString())
      .then(({ data }) => setPicked(new Set((data || []).map((r) => new Date(r.slot_start).getTime()))));
  }, [format, profile.id]);

  const selected = calendar.find((d) => d.key === selKey);
  const toggle = (ms) => { const s = new Set(picked); s.has(ms) ? s.delete(ms) : s.add(ms); setPicked(s); };
  const setDay = (day, on) => {
    const s = new Set(picked);
    day.slots.forEach((ms) => (on ? s.add(ms) : s.delete(ms)));
    setPicked(s);
  };

  const save = async () => {
    setMsg(''); setBusy(true);
    const del = await supabase.from('mock_availability').delete()
      .eq('user_id', profile.id).eq('format', format).gt('slot_start', new Date().toISOString());
    if (del.error) { setBusy(false); return setMsg(del.error.message); }
    const rows = [...picked].map((ms) => ({ user_id: profile.id, slot_start: new Date(ms).toISOString(), format }));
    if (rows.length) {
      const ins = await supabase.from('mock_availability').insert(rows);
      if (ins.error) { setBusy(false); return setMsg(ins.error.message); }
    }
    const { error } = await supabase.rpc('run_matching');
    setBusy(false);
    setMsg(error ? error.message : 'Availability saved. If a match is found, it appears on your dashboard and under Reminders.');
  };

  const info = INFO[format];
  const price = format === '1to1' ? rules.mock_1to1_cost : rules.mock_group_cost;
  const first = calendar[0];

  return (
    <>
      <div className="page-head"><div><h1>Mock interviews</h1>
        <p className="muted">Pick a date, then tick every time you are free. We match you with students who have similar roles or majors. All times are Hong Kong time.</p></div>
        <Link href="/reminders" className="btn">View my sessions</Link></div>

      {!profile.sector && !(profile.tags || []).length && (
        <div className="alert info" style={{ marginBottom: 16 }}>You have no sector or tags yet, which may reduce your matches. <Link href="/profile">Set them on your profile</Link>.</div>
      )}

      <div className="card">
        <div className="switch">
          {Object.entries(INFO).map(([k, v]) => (
            <button key={k} type="button" className={format === k ? 'chip on' : 'chip'} onClick={() => setFormat(k)}>{v.label}</button>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          {info.text} {profile.is_admin ? 'Admin: never charged.' :
            `Booking is free. After the session you pay ${price} credits, and only if you actually joined.`}
        </p>

        <div className="cal-head">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">
          {Array.from({ length: first.dow }).map((_, i) => <div key={`b${i}`} />)}
          {calendar.map((d, i) => {
            const n = d.slots.filter((ms) => picked.has(ms)).length;
            const off = d.slots.length === 0;
            return (
              <button type="button" key={d.key} disabled={off}
                className={`cal-cell${d.key === selKey ? ' sel' : ''}${off ? ' off' : ''}`}
                onClick={() => setSelKey(d.key)}>
                <span className="num">{d.day}</span>
                {(i === 0 || d.day === 1) && <span className="mon">{d.month}</span>}
                {n > 0 && <span className="count">{n}</span>}
              </button>
            );
          })}
        </div>

        {selected && selected.slots.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="doc-head">
              <h3>{selected.long}</h3>
              <div>
                <button type="button" className="btn small" onClick={() => setDay(selected, true)}>Select all day</button>{' '}
                <button type="button" className="btn small" onClick={() => setDay(selected, false)}>Clear day</button>
              </div>
            </div>
            <div className="slot-row">
              {selected.slots.map((ms) => (
                <button type="button" key={ms} className={picked.has(ms) ? 'chip on' : 'chip'} onClick={() => toggle(ms)}>{fmtTime(ms)}</button>
              ))}
            </div>
          </div>
        )}

        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Saving...' : `Save ${picked.size} slot${picked.size === 1 ? '' : 's'} and find matches`}
        </button>
        {msg && <div className="alert info">{msg}</div>}
      </div>
    </>
  );
}