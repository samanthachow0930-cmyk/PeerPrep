'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './landing.css';


const UST = /^[^\s@]+@([a-z0-9-]+\.)*ust\.hk$/i;
const DEF = { cv_request_cost: 2, review_reward: 5, enquiry_cost: 2, reply_reward: 5, mock_1to1_cost: 4, mock_group_cost: 4 };


function Count({ to, run }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, t0;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / 1200, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{v}</>;
}


export default function Landing() {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('cv');
  const [showBar, setShowBar] = useState(false);
  const [statsSeen, setStatsSeen] = useState(false);
  const [revs, setRevs] = useState(2);
  const [ans, setAns] = useState(1);
  const [after, setAfter] = useState(false);
  const [youJoined, setYouJoined] = useState(false);
  const statsRef = useRef(null);


  const R = { ...DEF, ...(info?.rules || {}) };


  useEffect(() => { supabase.rpc('public_info').then(({ data }) => setInfo(data || null)); }, []);


  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 650);
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); if (e.target === statsRef.current) setStatsSeen(true); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el));
    if (statsRef.current) io.observe(statsRef.current);
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, []);


  const start = (e) => {
    e.preventDefault();
    const m = email.trim();
    if (!UST.test(m)) return setErr('PeerPrep is for HKUST students. Please enter your ust.hk email.');
    router.push(`/login?mode=signup&email=${encodeURIComponent(m)}`);
  };


  const SERVICES = {
    cv: {
      label: 'CV peer review',
      steps: [
        'Upload your CV. Your name, contact details and links are covered in your browser before the file leaves your device.',
        'A fellow student reviews it with a structured form: strengths, improvements and specific edits.',
        'You rate each comment. Helpful ones earn the reviewer credits.',
      ],
      chips: [`Request a review: ${R.cv_request_cost} credits`],
      earn: `Review a CV: +${R.review_reward} credits when rated helpful`,
      demo: (<><h4>Example comment</h4><p><span className="tag">Impact</span>Your internship bullet says “helped with reports”. Try an action verb and a number, such as “Cut weekly reporting time by 30%”.</p><p><span className="lp-pill">Rated helpful</span></p></>),
    },
    ask: {
      label: 'Career enquiries',
      steps: [
        'Choose a question template for internships, graduate jobs, offers or work visas.',
        'Students in a similar sector or role answer. Tags help you find the right people.',
        'Mark the best answer. Its author earns credits.',
      ],
      chips: [`Ask a question: ${R.enquiry_cost} credits`],
      earn: `Best answer: +${R.reply_reward} credits`,
      demo: (<><h4>Example question</h4><p><span className="tag">Internship</span><span className="tag">Accounting</span></p><p>When do audit firms in Hong Kong open graduate applications, and how many rounds should I expect?</p><p><span className="lp-pill b">3 replies</span></p></>),
    },
    mock: {
      label: 'Mock interviews',
      steps: [
        'Open the two-week calendar, click a date and tick every time you are free.',
        'We match you with students aiming for similar roles or majors, one-to-one or in a group of up to 4.',
        'Join your private Jitsi Meet room at the agreed time. You are charged only after a session you attend.',
      ],
      chips: [`Host a 1-to-1: ${R.mock_1to1_cost} credits`, `Host a group: ${R.mock_group_cost} credits`],
      earn: 'Booking is free. No charge if your partner does not show',
      demo: (<><h4>Example match</h4><p><span className="tag">1-to-1</span>Thu 19:00 HKT</p><p>Matched with a student targeting data analyst roles. Roles swap halfway.</p><p><span className="lp-pill">Reminder on your dashboard</span></p></>),
    },
  };
  const S = SERVICES[tab];


  const credits = revs * R.review_reward + ans * R.reply_reward;
  const queue = [{ n: 'Student A', r: 3 }, { n: 'Student B', r: 1 }, { n: 'Student C', r: 5 }, ...(youJoined ? [{ n: 'You (new member)', r: 0, you: true }] : [])].sort((a, b) => a.r - b.r);


  const stats = [
    ['Members', info?.members], ['CV reviews given', info?.reviews],
    ['Enquiries answered', info?.answers], ['Mock interviews held', info?.sessions],
  ];
  const empty = info && stats.every(([, v]) => !v);


  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap">
        <a href="#top" className="lp-brand"><img src="/peerprep_logo.png" alt="PeerPrep" className="lp-logo-img" /></a>
          <nav className="lp-links">
            <a href="#how">How it works</a><a href="#give">Give &amp; get</a><a href="#fair">Fairness</a><a href="#privacy">Privacy</a><a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-actions">
            <Link href="/login" className="lp-btn lp-ghost lp-small">Sign in</Link>
            <Link href="/login?mode=signup" className="lp-btn lp-cta lp-small">Join free</Link>
          </div>
        </div>
      </header>


      <section className="lp-hero" id="top">
        <div className="lp-wrap">
          <div>
            <span className="lp-eyebrow" style={{ color: '#f5a524' }}>A student mutual-aid platform for HKUST</span>
            <h1>Great career help shouldn&apos;t depend on <em>who you know.</em></h1>
            <p className="lp-lead">Give a little time and knowledge, get real feedback back. Anonymous CV reviews, career Q&amp;A and mock interviews, run by students for students.</p>
            <form className="lp-form" onSubmit={start}>
              <input type="email" placeholder="your name@connect.ust.hk" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} aria-label="HKUST email" />
              <button className="lp-btn lp-cta">Get started</button>
            </form>
            <div className="lp-err">{err}</div>
            <div className="lp-trust"><span>HKUST students only</span><span>Anonymous by design</span><span>Fair queue for everyone</span></div>
          </div>
          <div className="lp-stack" aria-hidden="true">
            <div className="lp-card c1"><small>CV review · Data analyst</small><b>“Add a number to your project bullet.”</b><span className="lp-pill">Helpful +{R.review_reward} credits</span></div>
            <div className="lp-card c2"><small>Career enquiry · Graduate job</small><b>When do banks open graduate applications?</b><span className="lp-pill b">3 replies</span></div>
            <div className="lp-card c3"><small>Mock interview · Thu 19:00 HKT</small><b>Matched with 2 students, similar roles</b><span className="lp-pill">Room ready 10 min before</span></div>
            <span className="lp-ex">Illustrative examples</span>
          </div>
        </div>
      </section>


      <section className="lp-stats" ref={statsRef}>
        <div className="lp-wrap">
          {stats.map(([l, v]) => (
            <div key={l}><div className="lp-stat-n">{v == null ? '—' : <Count to={Number(v)} run={statsSeen} />}</div><div className="lp-stat-l">{l}</div></div>
          ))}
          <div className="lp-note">{empty ? 'Our pilot is just starting. Be one of the first members.' : 'Live figures from the PeerPrep pilot.'}</div>
        </div>
      </section>


      <section className="lp-section" id="how">
        <div className="lp-wrap lp-reveal">
          <span className="lp-eyebrow">How it works</span>
          <h2>Three ways to prepare, one shared pool</h2>
          <p className="lp-sub">Pick a service to see the steps, what it costs and what you earn.</p>
          <div className="lp-tabs">
            {Object.entries(SERVICES).map(([k, v]) => <button key={k} className={tab === k ? 'lp-tab on' : 'lp-tab'} onClick={() => setTab(k)}>{v.label}</button>)}
          </div>
          <div className="lp-panel">
            <div>
              <ol className="lp-steps">{S.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <div className="lp-chips">{S.chips.map((c) => <span className="lp-chip" key={c}>{c}</span>)}<span className="lp-chip earn">{S.earn}</span></div>
              <Link href="/login?mode=signup" className="lp-btn lp-cta">Try {S.label.toLowerCase()}</Link>
            </div>
            <div className="lp-demo">{S.demo}</div>
          </div>
        </div>
      </section>


      <section className="lp-section lp-cream" id="give">
        <div className="lp-wrap lp-two lp-reveal">
          <div>
            <span className="lp-eyebrow">Give &amp; get</span>
            <h2>Your time becomes someone&apos;s head start</h2>
            <p className="lp-sub" style={{ marginBottom: 0 }}>Everyone starts with 20 credits. Earn more by helping others: {R.review_reward} credits for each helpful CV review and {R.reply_reward} for each helpful answer. Credits move between students, never for money.</p>
          </div>
          <div className="lp-box">
            <div className="lp-row"><span>CV reviews I give this week</span><span>{revs}</span></div>
            <input className="lp-slider" type="range" min="0" max="6" value={revs} onChange={(e) => setRevs(+e.target.value)} />
            <div className="lp-row"><span>Enquiries I answer well</span><span>{ans}</span></div>
            <input className="lp-slider" type="range" min="0" max="4" value={ans} onChange={(e) => setAns(+e.target.value)} />
            <div className="lp-result">
              You could earn <b>{credits}</b> credits
              <div style={{ color: '#c9d4ee', marginTop: 6 }}>
                Enough for {Math.floor(credits / R.cv_request_cost)} CV review request{Math.floor(credits / R.cv_request_cost) === 1 ? '' : 's'} or {Math.floor(credits / R.mock_1to1_cost)} one-to-one mock interview{Math.floor(credits / R.mock_1to1_cost) === 1 ? '' : 's'}.
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="lp-section" id="fair">
        <div className="lp-wrap lp-two lp-reveal">
          <div className="lp-box">
            <ul className="lp-queue">
              {queue.map((q) => <li key={q.n} className={q.you ? 'you' : ''}><strong>{q.n}</strong><span className="lp-pill b">{q.r} review{q.r === 1 ? '' : 's'} received</span></li>)}
            </ul>
            <button className="lp-btn lp-ghost dark lp-small" onClick={() => setYouJoined(!youJoined)}>{youJoined ? 'Reset example' : 'Simulate: I join as a new member'}</button>
            {youJoined && <p style={{ margin: '12px 0 0', fontWeight: 600 }}>New members who have had no feedback go to the front. <Link href="/login?mode=signup" style={{ color: 'var(--blue)' }}>Claim your spot →</Link></p>}
          </div>
          <div>
            <span className="lp-eyebrow">Fairness</span>
            <h2>The least-connected students go first</h2>
            <p className="lp-sub" style={{ marginBottom: 0 }}>Good feedback usually flows to people with networks. In PeerPrep, members who have received the fewest reviews are served first, then those who give the most helpful feedback, then first come first served. Credits can also be donated to someone stuck.</p>
          </div>
        </div>
      </section>


      <section className="lp-section lp-cream" id="privacy">
        <div className="lp-wrap lp-two lp-reveal">
          <div>
            <span className="lp-eyebrow">Privacy</span>
            <h2>Reviewers see your CV, not you</h2>
            <p className="lp-sub">When you upload, PeerPrep finds names, emails, phone numbers and links in your browser and covers them with solid black boxes. You check every page and can cover anything else, such as a photo. Only the redacted file is uploaded, and members appear under an alias.</p>
            <Link href="/login?mode=signup" className="lp-btn lp-cta">Protect my CV and join</Link>
          </div>
          <div>
            <div className="lp-toggle"><button className={!after ? 'on' : ''} onClick={() => setAfter(false)}>Before</button><button className={after ? 'on' : ''} onClick={() => setAfter(true)}>After</button></div>
            <div className="lp-cv">
              <div style={{ fontSize: 18, fontWeight: 800 }}><span className={'lp-pii' + (after ? ' hid' : '')}>Alex Chan</span></div>
              <div style={{ color: '#5d6a85' }}><span className={'lp-pii' + (after ? ' hid' : '')}>alex.chan@connect.ust.hk</span> · <span className={'lp-pii' + (after ? ' hid' : '')}>+852 9123 4567</span> · <span className={'lp-pii' + (after ? ' hid' : '')}>linkedin.com/in/alexchan</span></div>
              <div className="line" style={{ width: '40%', marginTop: 18 }} /><div className="line" /><div className="line" style={{ width: '88%' }} /><div className="line" style={{ width: '70%' }} />
              <div className="line" style={{ width: '40%', marginTop: 18 }} /><div className="line" /><div className="line" style={{ width: '76%' }} />
            </div>
            <p style={{ color: 'var(--mute)', fontSize: 13, marginTop: 8 }}>Sample data, for illustration.</p>
          </div>
        </div>
      </section>


      <section className="lp-section" id="faq">
        <div className="lp-wrap lp-reveal">
          <span className="lp-eyebrow">FAQ</span>
          <h2>Good questions</h2>
          <div className="lp-faq" style={{ marginTop: 20 }}>
            <details><summary>Who can join?</summary><p>HKUST students. Sign-up only accepts ust.hk email addresses, including subdomains such as connect.ust.hk.</p></details>
            <details><summary>Does it cost money?</summary><p>No. PeerPrep runs on credits that students earn by helping each other. You start with 20 credits. A CV review request or an enquiry costs {R.cv_request_cost} credits, and a mock interview costs {R.mock_1to1_cost}.</p></details>
            <details><summary>What if I do not have time to review others?</summary><p>Use your starting credits first, then review a CV or answer an enquiry when you can. Helpful contributions earn credits, and reviewing is based on quality, not volume.</p></details>
            <details><summary>How are mock interviews held?</summary><p>You get a private Jitsi Meet link in your dashboard reminders. On the public Jitsi server the first person in may be asked to sign in with Google, Facebook or GitHub to open the room, so agree who starts it.</p></details>
            <details><summary>Any guarantees?</summary><p>No. PeerPrep gives you feedback and practice, not results. Rewriting someone else&apos;s CV and sharing leaked employer test content are not allowed.</p></details>
          </div>
        </div>
      </section>


      <section className="lp-final">
        <div className="lp-wrap lp-reveal">
          <h2>Give a few minutes. Get a head start.</h2>
          <p>On PeerPrep, every helper is also a beneficiary. Review a CV or answer a question today, and your own CV, questions and mock interviews get the same help back.</p>
          <Link href="/login?mode=signup" className="lp-btn lp-cta" style={{ fontSize: 18, padding: '16px 32px' }}>Join PeerPrep</Link>
        </div>
      </section>


      <footer className="lp-foot">
        <div className="lp-wrap"><span>© PeerPrep · A student philanthropy project at HKUST</span><span>Pilot version. Not affiliated with HKUST administration.</span></div>
      </footer>


      <div className={'lp-sticky' + (showBar ? ' show' : '')}>
      <span>Made for HKUST students</span>
      <Link href="/login?mode=signup" className="lp-btn lp-cta lp-small">Join</Link>
      </div>
    </div>
  );
}