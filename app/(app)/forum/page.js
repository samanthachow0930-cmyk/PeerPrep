'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';

const CATS = ['All', 'Internship', 'Graduate job', 'General'];

export default function Forum() {
  const { profile } = useApp();
  const [cat, setCat] = useState('All');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let q = supabase.from('forum_posts')
      .select('*, profiles:author(alias, sector), forum_replies(id, is_best)')
      .order('created_at', { ascending: false }).limit(100);
    if (cat !== 'All') q = q.eq('category', cat);
    if (tag) q = q.contains('tags', [tag]);
    if (mine && profile.tags?.length) q = q.overlaps('tags', profile.tags);
    if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
    q.then(({ data }) => setRows(data || []));
  }, [cat, tag, search, mine, profile.tags]);

  return (
    <>
      <div className="page-head">
        <div><h1>Forum</h1><p className="muted">Ask and answer questions about internships and graduate jobs. Best answers earn credits.</p></div>
        <Link href="/forum/new" className="btn primary">Ask a question</Link>
      </div>
      {!profile.tags?.length && (
        <div className="alert info" style={{ marginBottom: 16 }}>You have no tags yet. <Link href="/profile">Add tags</Link> or upload a CV to get suggestions.</div>
      )}
      <div className="filters">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Matching my tags
        </label>
        {tag && <button className="tag" onClick={() => setTag('')}>{tag} ✕</button>}
      </div>
      {rows === null ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card empty">No questions yet. Be the first to ask.</div>
      ) : rows.map((p) => {
        const answered = p.forum_replies.some((r) => r.is_best);
        return (
          <div className="card" key={p.id} style={{ marginBottom: 12 }}>
            <Link href={`/forum/${p.id}`} className="post-title">{p.title}</Link>
            <p className="muted" style={{ margin: '4px 0 8px' }}>
              {p.profiles?.alias}{p.profiles?.sector ? ` · ${p.profiles.sector}` : ''} · {p.category} · {new Date(p.created_at).toLocaleDateString()} · {p.forum_replies.length} repl{p.forum_replies.length === 1 ? 'y' : 'ies'}{' '}
              {answered && <span className="badge green">Answered</span>}
            </p>
            <div>{p.tags.map((t) => <button key={t} className="tag" onClick={() => setTag(t)}>{t}</button>)}</div>
          </div>
        );
      })}
    </>
  );
}