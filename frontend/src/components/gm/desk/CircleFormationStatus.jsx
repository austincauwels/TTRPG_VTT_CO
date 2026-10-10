import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BlankEntry, FormLine } from '../../shared/PrintMarks';
import { TickMark } from '../../shared/InkMarks';
import { SafeIcon } from '../../shared/SafeIcon';
import { leadingVote, leaders, TIE_RULE } from '../../../game/votes';
import { livingMembers } from '../../../game/roster';
import {
  questionName, questionText, insigniaLabel, voterIds, nameOnTheSeal,
  relationshipsAmong, waitingRelationships, answererOf, nameList,
} from '../../../game/circleFormation';

// The circle's formation papers (Form C.O. 4) as they stand on the players' desks, lying on
// the Lightkeeper's desk until the seal: open from the start (playtest, lk-formation-status-
// thin: folded, they never said the papers had opened on anyone's desk). Each part of the
// papers in their order: what leads, in full (the question's words, the chapter house, the
// insignia), a tie and how the seal breaks it, and a tick by each investigator who has
// voted, written or proposed, an open ring by each who has not. Everything comes from the
// state every desk of the campaign is sent. The open state lives in OperationsPanel so it
// survives tab changes.

const votesWord = (n) => `${n} vote${n === 1 ? '' : 's'}`;

// One part of the papers: its name, how far the circle has got with it, what stands so far
const Part = ({ title, tally, children }) => (
  <div className="pt-2.5 first:pt-0 border-t first:border-t-0 border-dashed border-sepia/40">
    <div className="flex items-baseline justify-between gap-3">
      <h4 className="font-sans font-bold text-xs text-sepia uppercase tracking-widest">{title}</h4>
      {tally && <span className="font-mono text-xs tabular-nums text-sepia shrink-0">{tally}</span>}
    </div>
    <div className="mt-1 space-y-1">{children}</div>
  </div>
);

// A line of what stands: a vote's lead in words, or the dotted blank where there is none
const Lead = ({ children }) => <p className="font-serif text-sm text-ink leading-snug [overflow-wrap:anywhere]">{children}</p>;

// Under a shared lead: what it is tied with, and which the seal takes
const Tie = ({ votes, nameOf }) => {
  const tied = leaders(votes).slice(1);
  return tied.length ? (
    <p className="font-serif italic text-sm text-sepia leading-snug [overflow-wrap:anywhere]">
      Tied with {nameList(tied.map(nameOf))}. {TIE_RULE}
    </p>
  ) : null;
};

// A tick by each investigator who has done their part, an open ring by each who has not.
// The marks and the caption are drawn; screen readers hear each name with its word.
const Marks = ({ caption, members, done, doneWord, notWord }) => (
  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-0.5">
    <span aria-hidden="true" className="font-sans font-bold text-xs uppercase tracking-widest text-sepia">{caption}</span>
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {members.map(inv => {
        const did = done(inv);
        return (
          <li key={inv.id} className={`inline-flex items-baseline gap-1 font-serif text-sm ${did ? 'text-ink' : 'text-sepia'}`}>
            {did
              ? <TickMark className="text-seal-green" />
              : <span aria-hidden="true" className="inline-block self-center w-[0.7em] h-[0.7em] rounded-full border border-dotted border-sepia" />}
            <span className="[overflow-wrap:anywhere]">{inv.name}</span>
            <span className="sr-only">{did ? `, ${doneWord}` : `, ${notWord}`}</span>
          </li>
        );
      })}
    </ul>
  </div>
);

export const CircleFormationStatus = ({ showCircleStatus, setShowCircleStatus, circleCreation }) => {
  const members = livingMembers(circleCreation.activeInvestigators);
  const n = members.length;
  const votes = circleCreation.votes || {};
  const ofKind = (kind) => votes[kind] || [];
  const count = (ids) => members.filter(inv => ids.has(inv.id)).length;

  const questionVotes = ofKind('question');
  const questionLead = leadingVote(questionVotes);
  const questionVoters = voterIds(questionVotes);
  const written = members.filter(inv => (inv.personal_circle_answer || '').trim());

  const nameVoters = voterIds(ofKind('name_vote'));
  const sealName = nameOnTheSeal(votes);
  const suggested = new Set(ofKind('name_suggest').map(v => v.value)).size;

  const house = (circleCreation.backstoryAnswers?.chapter_house || '').trim();

  const abilityVotes = ofKind('ability');
  const abilityLead = leadingVote(abilityVotes);
  const abilityVoters = voterIds(abilityVotes);

  const insigniaVotes = ofKind('insignia');
  const insigniaLead = leadingVote(insigniaVotes);
  const insigniaVoters = voterIds(insigniaVotes);

  const rels = relationshipsAmong(circleCreation.relationships, members);
  const waiting = waitingRelationships(rels);
  const proposers = new Set(rels.map(r => r.from_character_id));
  // Who has a relationship to answer, and how many, in the members' order
  const answering = members
    .map(inv => [inv, waiting.filter(r => answererOf(r) === inv.id).length])
    .filter(([, k]) => k > 0)
    .map(([inv, k]) => (k > 1 ? `${inv.name} (${k})` : inv.name));

  return (
    <div className="mt-3 hand-placed bg-parchment text-ink border border-sepia/30 rounded-sm shadow-[2px_6px_14px_rgba(0,0,0,0.55)]" style={{ '--tilt': '-0.5deg' }}>
      <h3>
        <button
          type="button"
          onClick={() => setShowCircleStatus(s => !s)}
          aria-expanded={showCircleStatus}
          aria-controls="circle-formation-status"
          className="pen-host w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-black/5 transition-colors"
        >
          <span className="flex flex-col">
            <span className="font-sans font-black text-xs uppercase tracking-widest text-sepia">
              <span className="pen-underline">Circle formation so far</span>
            </span>
            <FormLine>Form C.O. 4 · Circle formation papers</FormLine>
          </span>
          <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11" className={`shrink-0 text-sepia transition-transform duration-200 ${showCircleStatus ? 'rotate-180' : ''}`}>
            <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {showCircleStatus && (
          <motion.div
            id="circle-formation-status"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-dashed border-sepia/40 p-3 space-y-2.5">
              {/* Where the papers are: approving a request opens them on that desk */}
              <p className="font-serif italic text-sm text-ink leading-snug [overflow-wrap:anywhere]">
                {n === 0
                  ? "Approving a request opens these papers on that investigator's desk."
                  : `Open on ${n === 1 ? `${members[0].name}'s desk` : `the desks of ${nameList(members.map(inv => inv.name))}`} until the circle is finalized.`}
              </p>

              {/* I. The circle question, and each investigator's answer to it */}
              <Part title="I. Circle question" tally={n ? `${count(questionVoters)} of ${n} voted` : null}>
                {questionLead ? (
                  <>
                    <Lead><span className="font-bold">{questionName(questionLead.value)}</span> leads ({votesWord(questionLead.count)})</Lead>
                    <p className="font-serif italic text-sm text-ink/85 leading-snug">"{questionText(questionLead.value)}"</p>
                    <Tie votes={questionVotes} nameOf={questionName} />
                  </>
                ) : <Lead><BlankEntry label="No votes" /></Lead>}
                {n > 0 && <Marks caption="Voted" members={members} done={inv => questionVoters.has(inv.id)} doneWord="voted" notWord="not voted yet" />}
                {n > 0 && <Marks caption="Answered" members={members} done={inv => written.includes(inv)} doneWord="answered" notWord="no answer yet" />}
                {written.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    {written.map(inv => (
                      <div key={inv.id} className="bg-parchment-deep/40 rounded-sm p-2">
                        <p className="font-serif font-bold text-sm text-ink mb-1">{inv.name}</p>
                        <p className="font-serif text-sm text-ink/85 italic leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]">"{inv.personal_circle_answer}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </Part>

              {/* II. The circle's name: the seal takes the name voted for most, or with no
                  votes the name suggested most */}
              <Part title="II. Name" tally={n ? `${count(nameVoters)} of ${n} voted` : null}>
                {sealName ? (
                  <>
                    <Lead>
                      <span className="font-bold">"{sealName.value}"</span>{' '}
                      {sealName.voted ? `leads (${votesWord(sealName.count)})` : 'suggested, no votes yet'}
                      {suggested > 1 && <span className="text-sepia"> · {suggested} names suggested</span>}
                    </Lead>
                    {sealName.voted
                      ? <Tie votes={ofKind('name_vote')} nameOf={v => `"${v}"`} />
                      : <p className="font-serif italic text-sm text-sepia leading-snug">With no votes the seal takes the name suggested most, the first suggested on a tie.</p>}
                  </>
                ) : <Lead><BlankEntry label="None suggested" /></Lead>}
                {n > 0 && <Marks caption="Voted" members={members} done={inv => nameVoters.has(inv.id)} doneWord="voted" notWord="not voted yet" />}
              </Part>

              {/* III. The chapter house: one answer the circle writes together */}
              <Part title="III. Chapter house">
                {house
                  ? <p className="font-serif italic text-sm text-ink/85 leading-snug whitespace-pre-line [overflow-wrap:anywhere]">{house}</p>
                  : <Lead><BlankEntry label="Not written yet" /></Lead>}
              </Part>

              {/* IV. The circle ability */}
              <Part title="IV. Circle ability" tally={n ? `${count(abilityVoters)} of ${n} voted` : null}>
                {abilityLead ? (
                  <>
                    <Lead><span className="font-bold">{abilityLead.value}</span> leads ({votesWord(abilityLead.count)})</Lead>
                    <Tie votes={abilityVotes} nameOf={v => v} />
                  </>
                ) : <Lead><BlankEntry label="No votes" /></Lead>}
                {n > 0 && <Marks caption="Voted" members={members} done={inv => abilityVoters.has(inv.id)} doneWord="voted" notWord="not voted yet" />}
              </Part>

              {/* V. The insignia, drawn as it would be stamped on the charter */}
              <Part title="V. Insignia" tally={n ? `${count(insigniaVoters)} of ${n} voted` : null}>
                {insigniaLead ? (
                  <>
                    <Lead>
                      <span className="inline-flex items-center gap-2 align-middle">
                        <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full border border-ink/50 flex items-center justify-center bg-parchment-deep/40">
                          <SafeIcon name={insigniaLead.value} size={18} className="text-ink/85" />
                        </span>
                        <span><span className="font-bold">{insigniaLabel(insigniaLead.value)}</span> leads ({votesWord(insigniaLead.count)})</span>
                      </span>
                    </Lead>
                    <Tie votes={insigniaVotes} nameOf={insigniaLabel} />
                  </>
                ) : (
                  <Lead>
                    <span className="inline-flex items-center gap-2 align-middle">
                      <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full border border-dashed border-sepia/50" />
                      <BlankEntry label="No votes" />
                    </span>
                  </Lead>
                )}
                {n > 0 && <Marks caption="Voted" members={members} done={inv => insigniaVoters.has(inv.id)} doneWord="voted" notWord="not voted yet" />}
              </Part>

              {/* VI. Relationships: who has proposed one, and who has one to answer. Those
                  still waiting at the seal can be accepted on the Circle tab afterwards. */}
              <Part title="VI. Relationships" tally={rels.length ? `${rels.length - waiting.length} of ${rels.length} confirmed` : null}>
                {rels.length === 0
                  ? <Lead><BlankEntry label="None proposed" /></Lead>
                  : waiting.length === 0
                    ? <Lead><span className="text-seal-green font-semibold">All confirmed</span></Lead>
                    : <Lead>Waiting for an answer from {nameList(answering)}</Lead>}
                {n > 1 && <Marks caption="Proposed" members={members} done={inv => proposers.has(inv.id)} doneWord="has proposed one" notWord="none proposed yet" />}
              </Part>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
