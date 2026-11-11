'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';

export default function MyDocuments() {
  const { profile } = useApp();
  const [docs, setDocs] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('documents')
      .select('*, reviews(*, profiles:reviewer(alias))')
      .eq('owner', profile.id).order('created_at', { ascending: false });
    setDocs(data || []);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const rate = async (reviewId, helpful) => {
    setErr('');
    const { error } = await supabase.rpc('rate_review', { p_review: reviewId, p_helpful: helpful });
    if (error) setErr(error.message); else load();
  };

  const openPdf = async (path) => {
    const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, '_blank');
  };

  return (
    <>
      <div className="page-head"><div><h1>My documents</h1>
        <p className="muted">Rate each comment. Helpful ratings reward the reviewer with a credit.</p></div></div>
      {err && <div className="alert error">{err}</div>}
      {docs === null ? <div className="spinner" /> : docs.length === 0 ? (
        <div className="card empty">You have not uploaded anything yet.</div>
      ) : docs.map((d) => (
        <div className="card" key={d.id} style={{ marginBottom: 16 }}>
          <div className="doc-head">
            <div><h3>{d.title}</h3><p className="muted">{d.doc_type} · {d.target_role} · {new Date(d.created_at).toLocaleDateString()}</p></div>
            <div>
              <span className={d.status === 'open' ? 'badge' : 'badge green'}>{d.review_count} / 2 reviews</span>{' '}
              <button className="btn small" onClick={() => openPdf(d.file_path)}>View PDF</button>
            </div>
          </div>
          {d.reviews.length === 0 && <div className="muted">Waiting for a reviewer. You will see comments here once they arrive.</div>}
          {d.reviews.map((r) => (
            <div className="review" key={r.id}>
              <div className="review-top"><strong>{r.profiles?.alias}</strong><span className="badge">Rating {r.rating}/5</span></div>
              <p><strong>Strengths:</strong> {r.strengths}</p>
              <p><strong>Improvements:</strong> {r.improvements}</p>
              <p><strong>Specific edits:</strong> {r.edits}</p>
              {r.helpful === null ? (
                <div className="rate-row">
                  <span className="muted">Was this helpful?</span>
                  <button className="btn small primary" onClick={() => rate(r.id, true)}>Helpful</button>
                  <button className="btn small" onClick={() => rate(r.id, false)}>Not helpful</button>
                </div>
              ) : <span className={r.helpful ? 'badge green' : 'badge'}>{r.helpful ? 'Rated helpful' : 'Rated not helpful'}</span>}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}