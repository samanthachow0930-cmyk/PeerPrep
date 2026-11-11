'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { fmtFull } from '@/lib/mockSlots';

export default function Reminders() {
  const { profile, refresh } = useApp();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('mock_participants')
      .select('joined_at, charged, mock_sessions(id, format, slot_start, status, mock_participants(user_id, profiles:user_id(alias, sector)))')
      .eq('user_id', profile.id);
    setRows((data || []).filter((r) => r.mock_sessions)
      .sort((a, b) => new Date(a.mock_sessions.slot_start) - new Date(b.mock_sessions.slot_start)));
  }, [profile.id]);

  useEffect(() => { supabase.rpc('settle_sessions').then(() => { load(); refresh(); }); /* eslint-disable-next-line */ }, []);

  const join = async (sid) => {
    setMsg('');
    const { data, error } = await supabase.rpc('join_session', { p_session: sid });
    if (error) setMsg(error.message); else { window.open(data, '_blank', 'noopener'); load(); }
  };
  const cancel = async (sid) => {
    setMsg('');
    const { error } = await supabase.rpc('cancel_booking', { p_session: sid });
    if (error) return setMsg(error.message);
    await supabase.rpc('run_matching'); load();
  };

  const now = Date.now();
  const upcoming = (rows || []).filter((r) => r.mock_sessions.status === 'scheduled');
  const past = (rows || []).filter((r) => r.mock_sessions.status !== 'scheduled');

  const card = (r) => {
    const s = r.mock_sessions, start = new Date(s.slot_start).getTime();
    const open = now >= start - 10 * 60000 && now <= start + 60 * 60000;
    const others = s.mock_participants.filter((p) => p.user_id !== profile.id);
    return (
      <div className="card" key={s.id} style={{ marginBottom: 12 }}>
        <div className="doc-head">
          <div>
            <h3>{s.format === '1to1' ? '1-to-1 mock interview' : 'Group mock interview'}</h3>
            <p className="muted">{fmtFull(s.slot_start)}</p>
          </div>
          <span className={s.status === 'completed' ? 'badge green' : 'badge'}>{s.status}</span>
        </div>
        <p><strong>With:</strong> {others.length ? others.map((o) => `${o.profiles?.alias}${o.profiles?.sector ? ` (${o.profiles.sector})` : ''}`).join(', ') : 'No one else yet'}</p>
        {s.status === 'scheduled' && (
          <>
            <div className="rate-row">
              <button className="btn small primary" disabled={!open} onClick={() => join(s.id)}>
                {open ? 'Join Jitsi room' : `Opens ${fmtFull(new Date(start - 10 * 60000).toISOString())}`}
              </button>
              <button className="btn small" onClick={() => cancel(s.id)}>Cancel my place</button>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              The first person into the room may be asked to sign in with Google, Facebook or GitHub to start it. Agree who opens it. Credits are charged only after the session, and only if 2 or more people joined.
            </p>
          </>
        )}
        {s.status === 'completed' && <p className="muted">{r.charged > 0 ? `Charged ${r.charged} credits.` : 'No credits charged.'}</p>}
        {s.status === 'cancelled' && <p className="muted">Cancelled. Nothing was charged. Your saved slots can still be matched again.</p>}
      </div>
    );
  };

  return (
    <>
      <div className="page-head"><div><h1>Reminders</h1><p className="muted">Your matched mock interviews. Times are Hong Kong time.</p></div></div>
      {msg && <div className="alert error">{msg}</div>}
      {rows === null ? <div className="spinner" /> : (
        <>
          <h3>Upcoming</h3>
          {upcoming.length === 0 ? <div className="card empty">No matched sessions yet. Add availability on the Mock interviews page.</div> : upcoming.map(card)}
          {past.length > 0 && <><h3 style={{ marginTop: 24 }}>Past</h3>{past.map(card)}</>}
        </>
      )}
    </>
  );
}