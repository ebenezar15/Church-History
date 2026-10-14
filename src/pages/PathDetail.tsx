import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas, hrefFor, labelFor } from '../data/db';
import type { StudyPath } from '../data/schema';
import { formatYear } from '../data/families';
import { useUi } from '../store/ui';
import { Icon } from '../components/Icon';
import { PageHeader, cx } from '../components/ui';
import { DOCTRINE_ICON } from './Doctrines';
import NotFound from './NotFound';

export default function PathDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const p = a.get<StudyPath>('path', id);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });
  if (!p) return <NotFound />;
  const total = p.steps.length + (p.quiz.length ? 1 : 0);
  const go = (d: number) => { setDir(d); setStep((s) => Math.max(0, Math.min(total - 1, s + d))); };
  const isQuiz = step === p.steps.length;
  const s = p.steps[step];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Study path" icon={DOCTRINE_ICON[p.icon]} title={p.title}><p>{p.summary}</p></PageHeader>

      <div className="mb-6 flex items-center gap-1" role="tablist" aria-label="Steps">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} role="tab" aria-selected={i === step} aria-label={i === p.steps.length ? 'Quiz' : `Step ${i + 1}`} onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }} className="relative h-2 flex-1 overflow-hidden rounded-full bg-line">
            <motion.span className="absolute inset-0 origin-left rounded-full bg-accent" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.35 }} />
          </button>
        ))}
      </div>

      <div className="relative min-h-[380px] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 80, rotateY: dir * -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: dir * -80, rotateY: dir * 15 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            style={{ transformPerspective: 1200 }}
          >
            {isQuiz ? (
              <Quiz path={p} />
            ) : (
              <article className="card p-6 sm:p-8">
                <div className="mb-2 flex items-center gap-3 text-sm font-bold text-muted">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">{step + 1}</span>
                  Step {step + 1} of {p.steps.length}
                  {s.year !== undefined && <span className="chip ml-auto">{formatYear(s.year)}</span>}
                </div>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{s.title}</h2>
                <div className="prose-atlas text-lg text-ink-2">{s.text.split(/\n\n+/).map((t, i) => <p key={i} className={i === 0 ? 'illuminated' : ''}>{t}</p>)}</div>
                {s.refs.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.refs.map((r, i) => (
                      <motion.div key={r.type + r.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.06 }}>
                        <Link to={hrefFor(r.type, r.id)} className="chip hover:border-accent hover:text-accent"><Icon name="arrow" size={12} /> {labelFor(a, r.type, r.id)}</Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </article>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="btn" onClick={() => go(-1)} disabled={step === 0}><Icon name="arrow-left" size={15} /> Back</button>
        <span className="self-center text-xs text-muted">← → keys work too</span>
        {step < total - 1 ? <button className="btn btn-primary" onClick={() => go(1)}>{step === p.steps.length - 1 && p.quiz.length ? 'Take the quiz' : 'Next'} <Icon name="arrow" size={15} /></button> : <Link to="/paths" className="btn">All paths</Link>}
      </div>
    </div>
  );
}

function Quiz({ path }: { path: StudyPath }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => path.quiz.map(() => null));
  const setScore = useUi((s) => s.setQuizScore);
  const done = answers.every((x) => x !== null);
  const score = answers.filter((x, i) => x === path.quiz[i].answer).length;
  useEffect(() => { if (done) setScore(path.id, score); }, [done, score, path.id, setScore]);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Quiz</h2>
      {path.quiz.map((q, qi) => {
        const picked = answers[qi];
        return (
          <div key={qi} className="card p-5">
            <div className="mb-3 font-bold">{qi + 1}. {q.question}</div>
            <div className="grid gap-2">
              {q.options.map((o, oi) => {
                const correct = oi === q.answer;
                const state = picked === null ? 'idle' : correct ? 'right' : picked === oi ? 'wrong' : 'idle';
                return (
                  <motion.button
                    key={oi}
                    disabled={picked !== null}
                    onClick={() => setAnswers((A) => A.map((x, i) => (i === qi ? oi : x)))}
                    animate={state === 'wrong' ? { x: [0, -8, 8, -5, 5, 0] } : state === 'right' ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={cx('rounded-xl border p-3 text-left text-sm transition', state === 'right' ? 'border-good bg-good/10 font-semibold' : state === 'wrong' ? 'border-bad bg-bad/10' : 'border-line hover:border-accent', picked !== null && state === 'idle' && 'opacity-60')}
                  >
                    {state === 'right' && <Icon name="check" size={14} className="mr-1 inline text-good" />}
                    {o}
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {picked !== null && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden text-sm text-ink-2">
                  <b>{picked === q.answer ? 'Correct. ' : 'Not quite. '}</b>{q.explanation}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} className="card p-6 text-center">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.8 }} className="mx-auto mb-2 w-fit text-accent"><Icon name="crown" size={44} /></motion.div>
            <div className="text-3xl font-bold">{score} / {path.quiz.length}</div>
            <p className="text-muted">{score === path.quiz.length ? 'Perfect — a doctor of the church!' : score >= path.quiz.length / 2 ? 'Well studied.' : 'Worth another walk through the path.'}</p>
            <button className="btn mt-3" onClick={() => setAnswers(path.quiz.map(() => null))}>Try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
