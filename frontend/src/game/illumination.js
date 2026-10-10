// What an assignment's reports are worth (rulebook p. 55): 1 Illumination for each of the
// circle's three questions answered yes, and for the Illumination Keys 2 when some of the
// investigators fulfilled one and 4 when every one of them did, nothing when none did.
// The questions were on every player's report, so one yes could come in four times, and
// nothing totalled the reports: the playtest's circle counted keys at 1 each and advanced
// about 5 Illumination early (playtest, report-questions-tally).

// The report filed a key (keys_detail ticks, or the older keys_fulfilled)
export const reportHasKey = (report) => {
  const r = report?.responses || {};
  if (r.keys_detail && Object.values(r.keys_detail).some(Boolean)) return true;
  return r.keys_fulfilled === 'some' || r.keys_fulfilled === 'all';
};

// { questions, withKey, members, keys, total } for the living investigators, their reports
// by character id, and the Lightkeeper's three answers
export const tallyReports = (investigators, reports, answers) => {
  const living = (investigators || []).filter(inv => !inv.is_dead);
  const withKey = living.filter(inv => reportHasKey(reports?.[inv.id] ?? reports?.[String(inv.id)])).length;
  const keys = withKey === 0 ? 0 : withKey === living.length ? 4 : 2;
  const questions = (answers || []).filter(Boolean).length;
  return { questions, withKey, members: living.length, keys, total: questions + keys };
};
