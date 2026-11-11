'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { scanPdf, exportRedactedPdf, PageEditor } from '@/components/PdfRedactor';
import { detectProfile, SECTORS, mergeTags } from '@/lib/profileTags';
import { useRules } from '@/lib/useRules';

const FOCUS = ['Clarity', 'Impact', 'Format', 'Role fit'];

export default function Upload() {
  const { profile, refresh } = useApp();
  const router = useRouter();
  const [sugg, setSugg] = useState(null); // { sector, tags, picked }
  const [f, setF] = useState({ title: '', doc_type: 'CV', target_role: profile.role || '' });
  const [focus, setFocus] = useState(['Clarity']);
  const [fullName, setFullName] = useState('');
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [textFound, setTextFound] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (x) => setFocus(focus.includes(x) ? focus.filter((i) => i !== x) : [...focus, x]);
  const rules = useRules();
  const canAfford = profile.is_admin || profile.free_reviews > 0 || profile.credits >= rules.cv_request_cost;

  const runScan = async () => {
    setMsg('');
    if (!file || file.type !== 'application/pdf') return setMsg('Please choose a PDF file first.');
    setScanning(true); setConfirmed(false); setPages(null);
    try {
      const r = await scanPdf(file, fullName);
      setPages(r.pages); setTextFound(r.textFound);
      const d = detectProfile(r.text);
      setSugg({ sector: d.sector || profile.sector || '', tags: d.tags, picked: d.tags });
    } catch (err) { setMsg('Could not read this PDF: ' + err.message); }
    setScanning(false);
  };

  const setBoxes = (i, boxes) => { setPages((ps) => ps.map((p, k) => (k === i ? { ...p, boxes } : p))); setConfirmed(false); };
  const totalBoxes = pages ? pages.reduce((n, p) => n + p.boxes.length, 0) : 0;

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    if (!pages) return setMsg('Scan your PDF and review the preview first.');
    if (!focus.length) return setMsg('Pick at least one feedback focus.');
    setBusy(true);
    try {
      const blob = await exportRedactedPdf(pages);
      if (blob.size > 5 * 1024 * 1024) throw new Error('Redacted file is over 5 MB. Use fewer pages.');
      const path = `${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage.from('cvs').upload(path, blob, { contentType: 'application/pdf' });
      if (upErr) throw upErr;
      const { error } = await supabase.from('documents').insert({ owner: profile.id, ...f, focus, file_path: path });
      if (error) { await supabase.storage.from('cvs').remove([path]); throw error; }
      if (sugg) {
        await supabase.from('profiles').update({
          sector: sugg.sector || null,
          tags: mergeTags(sugg.picked, profile.role ? [profile.role] : [], profile.tags || []),
        }).eq('id', profile.id);
      }
      await refresh();
      router.push('/my-documents');
    } catch (err) { setMsg(err.message); setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Request a review</h1>
        <p className="muted">{!canAfford && <div className="alert error">You need {rules.cv_request_cost} credits to request a review. Review a classmate&apos;s CV or answer a forum enquiry to earn more.</div>}</p></div></div>
      <form className="card narrow-left" onSubmit={submit}>
        <label>Title</label>
        <input required placeholder="e.g. Data analyst internship CV" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="row2">
          <div><label>Document type</label>
            <select value={f.doc_type} onChange={(e) => setF({ ...f, doc_type: e.target.value })}><option>CV</option><option>Cover letter</option></select></div>
          <div><label>Target role</label>
            <input required value={f.target_role} onChange={(e) => setF({ ...f, target_role: e.target.value })} /></div>
        </div>
        <label>Feedback focus</label>
        <div className="chips">
          {FOCUS.map((x) => <button type="button" key={x} className={focus.includes(x) ? 'chip on' : 'chip'} onClick={() => toggle(x)}>{x}</button>)}
        </div>

        <label>Your full name (used only to find and cover it in the document)</label>
        <input placeholder="e.g. Chan Tai Man" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label>PDF file (max 5 pages)</label>
        <input type="file" accept="application/pdf" onChange={(e) => { setFile(e.target.files[0]); setPages(null); }} />
        <button type="button" className="btn" onClick={runScan} disabled={!file || scanning}>{scanning ? 'Scanning...' : 'Scan and preview'}</button>

        {pages && (
          <>
            <div className="alert info">
              <strong>{totalBoxes} area{totalBoxes === 1 ? '' : 's'} covered automatically.</strong> Drag on the page to cover anything else
              (photo, address, name). Click a black box to remove it. Only this redacted version is uploaded.
            </div>
            {!textFound && <div className="alert error">No selectable text found (scanned PDF). Nothing was auto-detected, so cover all personal information by hand.</div>}
            {pages.map((p, i) => <PageEditor key={i} page={p} index={i} onBoxes={setBoxes} />)}
            {sugg && (
              <div className="alert info">
                <strong>Suggested profile tags (read from your CV in your browser; the text is not saved).</strong>
                <label>Academic sector</label>
                <select value={sugg.sector} onChange={(e) => setSugg({ ...sugg, sector: e.target.value })}>
                  <option value="">Not sure</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div style={{ marginTop: 10 }}>
                  {sugg.tags.length === 0 && <span className="muted">No tags detected. You can add them on the Profile page.</span>}
                  {sugg.tags.map((t) => (
                    <button type="button" key={t}
                      className={sugg.picked.includes(t) ? 'chip on' : 'chip'}
                      style={{ marginRight: 6 }}
                      onClick={() => setSugg({ ...sugg, picked: sugg.picked.includes(t) ? sugg.picked.filter((x) => x !== t) : [...sugg.picked, t] })}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="check">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              I checked every page. My name, email, phone, links, photo and address are covered.
            </label>
          </>
        )}
        <button className="btn primary" disabled={!pages || !confirmed || busy || !canAfford}>{busy ? 'Uploading...' : 'Submit to queue'}</button>
        {msg && <div className="alert error">{msg}</div>}
      </form>
    </>
  );
}