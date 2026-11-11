'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { TEMPLATES } from '@/lib/forumTemplates';
import { mergeTags } from '@/lib/profileTags';

export default function NewPost() {
  const { profile, refresh } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ category: 'Internship', title: '', body: '' });
  const [tagText, setTagText] = useState(mergeTags(profile.tags || [], profile.role ? [profile.role] : []).slice(0, 6).join(', '));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const applyTemplate = (i) => {
    if (i === '') return;
    const t = TEMPLATES[Number(i)];
    setF({ category: t.category, title: t.title, body: t.body });
  };

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    const tags = mergeTags(tagText.split(',')).slice(0, 6);
    if (/\[[^\]]+\]/.test(f.title)) return setMsg('Replace the [bracketed] parts of the title with your details.');
    setBusy(true);
    const { data, error } = await supabase.from('forum_posts')
      .insert({ author: profile.id, ...f, tags }).select('id').single();
    setBusy(false);
    if (error) return setMsg(error.message);
    await refresh();
    router.push(`/forum/${data.id}`);
  };

  return (
    <>
      <div className="page-head"><div><h1>Ask a question</h1>
        <p className="muted">{profile.is_admin ? 'Admin: no cost.' : `Your first enquiry is free (${profile.free_enquiries} left). After that it costs 1 credit.`}</p></div></div>
      <form className="card narrow-left" onSubmit={submit}>
        <label>Start from a template (optional)</label>
        <select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">Blank question</option>
          {TEMPLATES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
        </select>
        <label>Category</label>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option>Internship</option><option>Graduate job</option><option>General</option>
        </select>
        <label>Title</label>
        <input required minLength={8} maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <label>Details</label>
        <textarea required minLength={20} rows={9} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <label>Tags (comma separated, max 6)</label>
        <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Accounting, Audit" />
        <button className="btn primary" disabled={busy}>{busy ? 'Posting...' : 'Post question'}</button>
        {msg && <div className="alert error">{msg}</div>}
      </form>
    </>
  );
}