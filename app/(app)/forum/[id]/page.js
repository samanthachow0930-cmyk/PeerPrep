'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppProvider';
import { useRules } from '@/lib/useRules';

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useApp();
  const rules = useRules();
  const [post, setPost] = useState(undefined);
  const [replies, setReplies] = useState([]);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('forum_posts').select('*, profiles:author(alias, sector)').eq('id', id).maybeSingle();
    setPost(data || null);
    if (data && data.author === profile.id) await supabase.rpc('mark_post_seen', { p_post: id });
    const { data: r } = await supabase.from('forum_replies').select('*, profiles:author(alias, sector)').eq('post_id', id).order('created_at');
    setReplies((r || []).sort((a, b) => Number(b.is_best) - Number(a.is_best)));
  }, [id, profile.id]);
  useEffect(() => { load(); }, [load]);

  const reply = async (e) => {
    e.preventDefault(); setMsg('');
    const { error } = await supabase.from('forum_replies').insert({ post_id: id, author: profile.id, body });
    if (error) return setMsg(error.message);
    setBody(''); load();
  };
  const markBest = async (rid) => {
    const { error } = await supabase.rpc('mark_best_reply', { p_reply: rid });
    if (error) setMsg(error.message); else load();
  };
  const removePost = async () => {
    if (!confirm('Delete this question and all replies?')) return;
    await supabase.from('forum_posts').delete().eq('id', id);
    router.push('/forum');
  };
  const removeReply = async (rid) => { await supabase.from('forum_replies').delete().eq('id', rid); load(); };

  if (post === undefined) return <div className="spinner" />;
  if (post === null) return <div className="card">Question not found. <a href="/forum">Back to forum</a></div>;
  const canMark = (post.author === profile.id || profile.is_admin) && !replies.some((r) => r.is_best);

  return (
    <>
      <div className="card">
        <div className="doc-head">
          <div>
            <h1 style={{ fontSize: 22 }}>{post.title}</h1>
            <p className="muted">{post.profiles?.alias}{post.profiles?.sector && <span className="tag sector" style={{ marginLeft: 8 }}>{post.profiles.sector}</span>} · {post.category} · {new Date(post.created_at).toLocaleString()}</p>
          </div>
          {(post.author === profile.id || profile.is_admin) && <button className="btn small" onClick={removePost}>Delete</button>}
        </div>
        <p className="pre">{post.body}</p>
        <div>{post.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
      </div>

      <h3 style={{ margin: '22px 0 4px' }}>{replies.length} repl{replies.length === 1 ? 'y' : 'ies'}</h3>
      <div className="card">
        {replies.length === 0 && <div className="muted">No replies yet.</div>}
        {replies.map((r) => (
          <div key={r.id} className={r.is_best ? 'reply best' : 'reply'}>
            <div className="review-top">
              <strong>{r.profiles?.alias}{r.profiles?.sector && <span className="tag sector" style={{ marginLeft: 8 }}>{r.profiles.sector}</span>}</strong>
              {r.is_best && <span className="badge green">Best answer</span>}
            </div>
            <p className="pre">{r.body}</p>
            <div className="rate-row">
              {canMark && r.author !== post.author && <button className="btn small primary" onClick={() => markBest(r.id)}>Mark as best answer</button>}
              {(r.author === profile.id || profile.is_admin) && <button className="btn small" onClick={() => removeReply(r.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>

      <form className="card" style={{ marginTop: 16 }} onSubmit={reply}>
        <h3>Your reply</h3>
        <p className="muted">If the asker marks your reply as the best answer, you earn {rules.reply_reward} credits.</p>
        <textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share specific, practical advice. No leaked employer test content." />
        <button className="btn primary">Post reply</button>
        {msg && <div className="alert error">{msg}</div>}
      </form>
    </>
  );
}