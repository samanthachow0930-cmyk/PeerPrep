'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from './AppProvider';


const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Request a review' },
  { href: '/queue', label: 'Review queue' },
  { href: '/forum', label: 'Forum' },
  { href: '/mock', label: 'Mock interviews' },
];

const PERSONAL_NAV = [
  { href: '/my-documents', label: 'My documents' },
  { href: '/profile', label: 'Profile & tags' },
  { href: '/reminders', label: 'Reminders' },
  { href: '/credits', label: 'Credits' },
];


function Sparkle() {
  return (
    <span className="sparkle" title="Upload your CV first" aria-label="Upload your CV first">
      <svg viewBox="0 0 24 24" className="star big" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
      <svg viewBox="0 0 24 24" className="star small" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
    </span>
  );
}


export default function Shell({ children }) {
  const path = usePathname();
  const { profile, signOut } = useApp();
  const [hasCv, setHasCv] = useState(true);


  useEffect(() => {
    if (!profile) return;
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('owner', profile.id)
      .then(({ count }) => setHasCv((count || 0) > 0));
  }, [path, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  if (!profile) return null;

  const renderLink = (n) => (
    <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? 'nav active' : 'nav'}>
      {n.label}
      {n.href === '/upload' && !hasCv && <Sparkle />}
    </Link>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><img src="/peerprep_logo.png" alt="PeerPrep" className="brand-logo" /></div>
        <nav>
          {MAIN_NAV.map(renderLink)}
          <hr className="sidebar-divider" />
          {PERSONAL_NAV.map(renderLink)}
        </nav>
        <div className="user">
          <div className="avatar">{profile.alias.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="user-alias">{profile.alias}</div>
            <div className="muted-light">{profile.is_admin ? 'Admin · unlimited' : `${profile.credits} credits`}</div>
          </div>
          <button className="link-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}