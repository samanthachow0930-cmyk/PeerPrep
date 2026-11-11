'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { useRules } from '@/lib/useRules';

export default function Credits() {
  const { profile } = useApp();
  const rules = useRules();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    supabase.from('credit_ledger').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  const table = [
    ['Request a CV review', -rules.cv_request_cost, 'Spent when you submit a request'],
    ['Post a forum enquiry', -rules.enquiry_cost, 'Spent when you post'],
    ['Host a 1-to-1 mock interview', -rules.mock_1to1_cost, 'Charged after the session, only if you join'],
    ['Host a group mock interview (3–4)', -rules.mock_group_cost, 'Charged after the session, only if you join'],
    ['CV review rated helpful', rules.review_reward, 'Earned by the reviewer'],
    ['Enquiry reply marked best answer', rules.reply_reward, 'Earned by the replier'],
  ];

  return (
    <>
      <div className="page-head"><div><h1>Credits</h1><p className="muted">You start with 20 credits. Earn more from helpful contributions, not volume.</p></div></div>
      <div className="grid4">
        <div className="card stat"><div className="stat-value">{profile.is_admin ? '∞' : profile.credits}</div><div className="muted">Credit balance</div></div>
      </div>

      <div className="card table-card" style={{ marginTop: 20 }}>
        <h3 style={{ padding: '16px 20px 0' }}>How credits work</h3>
        <table>
          <thead><tr><th>Action</th><th>Credits</th><th>Notes</th></tr></thead>
          <tbody>{table.map(([a, c, n]) => (
            <tr key={a}><td>{a}</td><td className={c > 0 ? 'pos' : 'neg'}>{c > 0 ? `+${c}` : c}</td><td className="muted">{n}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div className="card table-card" style={{ marginTop: 20 }}>
        <h3 style={{ padding: '16px 20px 0' }}>History</h3>
        {rows === null ? <div className="spinner" /> : rows.length === 0 ? <div className="empty">No credit activity yet.</div> : (
          <table>
            <thead><tr><th>Date</th><th>Reason</th><th>Change</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.reason}</td>
                <td className={r.delta > 0 ? 'pos' : 'neg'}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}