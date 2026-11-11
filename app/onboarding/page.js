'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';

const INDUSTRIES = ['Finance', 'Consulting', 'Technology', 'Marketing', 'Public sector', 'Engineering', 'Other'];

export default function Onboarding() {
  const { profile, refresh } = useApp();
  const [form, setForm] = useState({ alias: '', target: 'Internship', industry: 'Technology', role: '' });
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setBusy(true);
    const { error } = await supabase.from('profiles')
      .update({ ...form, alias: form.alias.trim(), onboarded: true }).eq('id', profile.id);
    setBusy(false);
    if (error) setMsg(error.code === '23505' ? 'That alias is taken. Please choose another.' : error.message);
    else await refresh();
  };

  return (
    <div className="center-screen">
      <form className="card narrow" onSubmit={submit}>
        <h2>Set up your profile</h2>
        <p className="muted">Your alias is the only name other members will see.</p>
        <label>Display alias</label>
        <input required minLength={3} maxLength={20} placeholder="e.g. BlueFalcon" value={form.alias} onChange={set('alias')} />
        <label>I am preparing for</label>
        <select value={form.target} onChange={set('target')}>
          <option>Internship</option><option>Graduate job</option>
        </select>
        <label>Industry</label>
        <select value={form.industry} onChange={set('industry')}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
        <label>Target role</label>
        <input required placeholder="e.g. Data analyst" value={form.role} onChange={set('role')} />
        <div className="alert info">
          <strong>Starter allowance:</strong> 1 free CV review. After that, earn credits by writing helpful reviews.
        </div>
        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I agree to the community guidelines: be respectful, do not rewrite others&apos; CVs, do not share leaked employer test content, and understand there is no guarantee of results.
        </label>
        <button className="btn primary full" disabled={!agree || busy}>{busy ? 'Saving...' : 'Join PeerPrep'}</button>
        {msg && <div className="alert error">{msg}</div>}
      </form>
    </div>
  );
}