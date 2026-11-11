'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const UST = /^[^\s@]+@([a-z0-9-]+\.)*ust\.hk$/i;
const UAT_EMAILS = ['samanthachow0930@gmail.com'];

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('mode') === 'signup') setMode('signup');
    if (q.get('email')) setEmail(q.get('email'));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    const mail = email.trim().toLowerCase();

    if (mode === 'signup') {
      if (!UST.test(mail) && !UAT_EMAILS.includes(mail)) return setMsg('PeerPrep is for HKUST students. Please use your ust.hk email address.');
      if (password.length < 8) return setMsg('Password must be at least 8 characters.');
    }

    setBusy(true);
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email: mail, password })
        : await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);

    if (error) {
      const m = error.message || '';
      setMsg(m.includes('Database error') ? 'Only HKUST (ust.hk) email addresses can join PeerPrep.' : m);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
      <div className="brand big"><img src="/peerprep_logo.png" alt="PeerPrep" className="brand-logo" /></div>        <h1>Better career preparation, shared by students.</h1>
        <p>Give feedback, earn credits, and get your CV and interview skills reviewed by HKUST peers. Anonymous, fair, and free.</p>
        <ul className="hero-list">
          <li>Anonymous CV and cover-letter reviews</li>
          <li>Priority for students with fewer resources</li>
          <li>Credits earned through helpful feedback</li>
        </ul>
      </div>
      <div className="login-panel">
        <div className="card login-card">
        <a href="/" className="link-btn" style={{ marginTop: 0, display: 'inline-block', marginBottom: 8 }}>← Back to home</a>
          <h2>{mode === 'signin' ? 'Sign in to PeerPrep' : 'Create your account'}</h2>
          <form onSubmit={submit}>
            <label>HKUST email</label>
            <input type="email" required placeholder="name@connect.ust.hk" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label>Password</label>
            <input type="password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn primary full" disabled={busy}>
              {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
          <button type="button" className="link-btn" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }}>
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
          {msg && <div className="alert error">{msg}</div>}
        </div>
      </div>
    </div>
  );
}