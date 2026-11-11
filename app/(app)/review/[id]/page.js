'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRules } from '@/lib/useRules';

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const rules = useRules();
  const [doc, setDoc] = useState(null);
  const [url, setUrl] = useState('');
  const [f, setF] = useState({ strengths: '', improvements: '', edits: '', rating: 4 });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('queue_view').select('*').eq('id', id).maybeSingle();
      if (!data) return setDoc(false);
      setDoc(data);
      const { data: s } = await supabase.storage.from('cvs').createSignedUrl(data.file_path, 3600);
      setUrl(s?.signedUrl || '');
    })();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setBusy(true);
    const { error } = await supabase.rpc('submit_review', {
      p_doc: id, p_strengths: f.strengths, p_improvements: f.improvements, p_edits: f.edits, p_rating: Number(f.rating),
    });
    setBusy(false);
    if (error) setMsg(error.message); else router.push('/queue');
  };

  if (doc === null) return <div className="spinner" />;
  if (doc === false) return <div className="card">This document is no longer available. <a href="/queue">Back to queue</a></div>;

  return (
    <>
      <div className="page-head"><div><h1>{doc.title}</h1>
        <p className="muted">{doc.doc_type} · Target: {doc.target_role} · Focus: {doc.focus.join(', ')}</p></div></div>
      <div className="split">
        <div className="card pdf-card">{url ? <iframe src={url} title="Document" /> : <div className="spinner" />}</div>
        <form className="card" onSubmit={submit}>
          <h3>Your structured review</h3>
          <div className="alert info small">Be specific and kind. Do not rewrite the CV. You earn {rules.review_reward} credits if the author rates your review as helpful.</div>
          <label>Strengths</label>
          <textarea required rows={3} value={f.strengths} onChange={set('strengths')} placeholder="What works well?" />
          <label>Improvements</label>
          <textarea required rows={3} value={f.improvements} onChange={set('improvements')} placeholder="What should be clearer or stronger?" />
          <label>Specific edits</label>
          <textarea required rows={3} value={f.edits} onChange={set('edits')} placeholder="e.g. Replace 'helped with' by an action verb and add a number." />
          <label>Overall rating</label>
          <select value={f.rating} onChange={set('rating')}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
          </select>
          <button className="btn primary full" disabled={busy}>{busy ? 'Submitting...' : 'Submit review'}</button>
          {msg && <div className="alert error">{msg}</div>}
        </form>
      </div>
    </>
  );
}