'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRules } from '@/lib/useRules';

export default function Queue() {
  const [rows, setRows] = useState(null);
  const rules = useRules();

  useEffect(() => {
    supabase.from('queue_view').select('*')
      .order('owner_received', { ascending: true })
      .order('owner_credits', { ascending: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => setRows(data || []));
  }, []);

  return (
    <>
      <div className="page-head"><div><h1>Review queue</h1>
        <p className="muted">Sorted by fairness: authors with no feedback yet come first, then higher credit balance, then upload time. Each helpful review earns you {rules.review_reward} credits.</p></div></div>
      <div className="card table-card">
        {rows === null ? <div className="spinner" /> : rows.length === 0 ? (
          <div className="empty">The queue is empty right now. Check back soon.</div>
        ) : (
          <table>
            <thead><tr><th>Document</th><th>Type</th><th>Target role</th><th>Focus</th><th>Priority</th><th>Uploaded</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong></td>
                  <td>{r.doc_type}</td>
                  <td>{r.target_role}</td>
                  <td>{r.focus.join(', ')}</td>
                  <td>{r.owner_received === 0 ? <span className="badge green">No feedback yet</span> : <span className="badge">{r.owner_received} received</span>}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td><Link className="btn small" href={`/review/${r.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}