'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { fmtFull } from '@/lib/mockSlots';

const ICONS = {
  check: (<><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9" /></>),
  chat: (<><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.3A8 8 0 1 1 21 12z" /><path d="M9 11h6M9 14h4" /></>),
  video: (<><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></>),
};

function ActionButton({ href, label, icon }) {
  return (
    <Link href={href} className="action-btn">
      <span className="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[icon]}</svg></span>
      {label}
    </Link>
  );
}

export default function Dashboard() {
  const { profile, refresh } = useApp();
  const [pending, setPending] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [unread, setUnread] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const pend = await supabase.from('reviews').select('id, documents!inner(owner)')
      .eq('documents.owner', profile.id).is('helpful', null);
    setPending(pend.data?.length || 0);

    const sess = await supabase.from('mock_participants')
      .select('mock_sessions(id, format, slot_start, status, mock_participants(user_id, profiles:user_id(alias)))')
      .eq('user_id', profile.id);
    setSessions((sess.data || []).map((r) => r.mock_sessions)
      .filter((x) => x && x.status === 'scheduled' && new Date(x.slot_start).getTime() > Date.now() - 60 * 60000)
      .sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start)).slice(0, 3));

    const posts = await supabase.from('forum_posts')
      .select('id, title, author_seen_at, forum_replies(id, created_at, author, profiles:author(alias))')
      .eq('author', profile.id);
    setUnread((posts.data || []).map((p) => {
      const fresh = p.forum_replies.filter((r) => r.author !== profile.id && new Date(r.created_at) > new Date(p.author_seen_at));
      return { id: p.id, title: p.title, count: fresh.length, from: [...new Set(fresh.map((r) => r.profiles?.alias).filter(Boolean))] };
    }).filter((x) => x.count > 0));
  }, [profile.id]);

  useEffect(() => { supabase.rpc('settle_sessions').then(() => { load(); refresh(); }); /* eslint-disable-next-line */ }, []);

  const join = async (sid) => {
    setMsg('');
    const { data, error } = await supabase.rpc('join_session', { p_session: sid });
    if (error) setMsg(error.message); else window.open(data, '_blank', 'noopener');
  };

  const freeTiles = profile.is_admin ? [] : [
    ['Free CV requests left', profile.free_reviews],
    ['Free enquiries left', profile.free_enquiries],
    ['Free mock interviews left', profile.free_mocks],
  ].filter(([, n]) => n > 0);

  const notices = unread.length + (pending > 0 ? 1 : 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Welcome, {profile.alias}</h1><p className="muted">Give first, then get.</p></div>
      </div>

      <div className="stat-row">
        <Stat label="Credits" value={profile.is_admin ? '∞' : profile.credits} />
        {freeTiles.map(([label, n]) => <Stat key={label} label={label} value={n} />)}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="doc-head"><h3>Notifications {notices > 0 && <span className="badge green">{notices}</span>}</h3></div>
          {notices === 0 && <p className="muted">You are all caught up.</p>}
          {unread.map((u) => (
            <div className="notice" key={u.id}>
              <div>
                <strong>{u.count} new repl{u.count === 1 ? 'y' : 'ies'}</strong> to &ldquo;{u.title}&rdquo;
                <div className="muted">from {u.from.join(', ')}</div>
              </div>
              <Link className="btn small" href={`/forum/${u.id}`}>Read</Link>
            </div>
          ))}
          {pending > 0 && (
            <div className="notice">
              <div><strong>{pending} comment{pending > 1 ? 's' : ''}</strong> on your CV waiting for your rating</div>
              <Link className="btn small" href="/my-documents">Rate</Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="doc-head"><h3>Upcoming mock interviews</h3><Link href="/reminders">All reminders</Link></div>
          {msg && <div className="alert error">{msg}</div>}
          {sessions.length === 0 && <p className="muted">Nothing scheduled yet.</p>}
          {sessions.map((x) => {
            const start = new Date(x.slot_start).getTime();
            const open = Date.now() >= start - 10 * 60000 && Date.now() <= start + 60 * 60000;
            const others = x.mock_participants.filter((p) => p.user_id !== profile.id).map((p) => p.profiles?.alias).join(', ');
            return (
              <div className="notice" key={x.id}>
                <div>
                  <strong>{x.format === '1to1' ? '1-to-1' : 'Group'} · {fmtFull(x.slot_start)}</strong>
                  <div className="muted">With {others || 'no one else yet'}</div>
                </div>
                <button className="btn small primary" disabled={!open} onClick={() => join(x.id)}>{open ? 'Join' : 'Not open yet'}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="action-row">
        <ActionButton href="/queue" icon="check" label="Review a CV" />
        <ActionButton href="/forum" icon="chat" label="Post / Reply an Enquiry" />
        <ActionButton href="/mock" icon="video" label="Practise your Interview" />
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return <div className="card stat"><div className="stat-value">{value}</div><div className="muted">{label}</div></div>;
}