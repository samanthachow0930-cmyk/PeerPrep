'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { SECTORS, mergeTags } from '@/lib/profileTags';

export default function ProfilePage() {
  const { profile, refresh } = useApp();
  const [sector, setSector] = useState(profile.sector || '');
  const [role, setRole] = useState(profile.role || '');
  const [tags, setTags] = useState(profile.tags || []);
  const [newTag, setNewTag] = useState('');
  const [msg, setMsg] = useState('');

  const addTag = () => { if (newTag.trim()) setTags(mergeTags(tags, [newTag])); setNewTag(''); };
  const save = async (e) => {
    e.preventDefault(); setMsg('');
    const { error } = await supabase.from('profiles')
      .update({ sector: sector || null, role, tags: mergeTags(tags, role ? [role] : []) }).eq('id', profile.id);
    if (error) return setMsg(error.message);
    await refresh(); setMsg('Saved.');
  };

  return (
    <>
      <div className="page-head"><div><h1>Profile & tags</h1>
        <p className="muted">Tags appear on your forum posts and drive the &quot;Matching my tags&quot; filter. Upload a CV to get suggestions automatically.</p></div></div>
      <form className="card narrow-left" onSubmit={save}>
        <label>Alias</label><input value={profile.alias} disabled />
        <label>Academic sector</label>
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Not set</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label>Target role</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Data analyst" />
        <label>Tags (max 8)</label>
        <div>{tags.map((t) => <button type="button" key={t} className="tag" onClick={() => setTags(tags.filter((x) => x !== t))}>{t} ✕</button>)}</div>
        <div className="row2" style={{ marginTop: 8 }}>
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add a tag, e.g. Accounting"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
          <div><button type="button" className="btn small" onClick={addTag}>Add tag</button></div>
        </div>
        <button className="btn primary">Save profile</button>
        {msg && <div className="alert info">{msg}</div>}
      </form>
    </>
  );
}