// The fifteen relationship types and their six prompt questions each, word for word from
// the rulebook. Used by the relationship form (components/pc/relationships).

export const RELATIONSHIP_DATA = {
  // The rulebook's name (p. 34); stored "Antagonist" rows are renamed at startup (vtt/db.py)
  Bully: [
    "This person does something that makes your life more difficult. What do they do, and why do you think they treat you this way?",
    "What do you admire about this person, but would never say?",
    "You stand in the way of something this person wants. How has this changed their behavior toward you?",
    "Despite the antagonism, your relationship with this person is the most constant of any connection in your life. What do they do that feels reliable?",
    "Despite the nature of your relationship, you once did something very kind for this person. What happened, and do they know?",
    "This person knows your weakness and how to manipulate it. What is it, and how does this change your behavior?",
  ],
  Champion: [
    "This person protects you from something. What is the threat, and how do they help?",
    "This person once spoke out on your behalf at great personal risk. What was the situation, and how did it affect you?",
    "This person has told you that you are in danger. What are they protecting you from?",
    "This person does something to help you in your everyday life. What is it, and how do you thank them?",
    "You once did something very cruel to this person. Why do you believe they continue to protect you anyway?",
    "This person makes you a better person. In what way are you different when they are with you?",
  ],
  Confidant: [
    "This person keeps your dark secret. What is it?",
    "You are very cautious around everyone but this person. Why?",
    "What does this person do that lets you know you can trust them?",
    "You two are planning something in the future. What is it, and why does it make you nervous?",
    "To the outside eye, you two have a very different relationship. How do people assume you're connected?",
    "You two once got away with something illicit. What was it, and how did it change your lives?",
  ],
  Coworker: [
    "You've employed this person for years. Why did you hire them?",
    "You both hate your outside job and find Candela Obscura a welcome distraction. What about your day job would you change?",
    "You both stole money from your employer. How did you do it, and why?",
    "Through the work you do together, you've discovered something wonderful about this person few people ever see. What is it, and do they know how you feel?",
    "You had a new job opportunity, but didn't want to leave this person behind. What was the other job, and why did you stay?",
    "You owe this person more loyalty than others would expect. What did they do for you?",
  ],
  Enemy: [
    "You disagree on a fundamental belief. What is it?",
    "Despite being enemies, you and this person share a secret. What is it, and how does it bring you together?",
    "This person harmed someone you love. What did they do, and what retribution do you seek?",
    "You were once allies. What tore you apart?",
    "You two share a common enemy. Who is it, and why have you both reluctantly teamed up against them?",
    "You're in love with your enemy. What caused these feelings to develop, and why do you keep it a secret?",
  ],
  Family: [
    "You're related by blood, but don't like each other. Why?",
    "This person has always been your closest family member. What do you rely on them for?",
    "This person has chosen you to carry on a family legacy. What is it, and do you believe you are worthy?",
    "You identify with your chosen family rather than your blood. What does this person do that affirms that belief?",
    "Your other family doesn't trust this person. Why is this, and do you agree?",
    "This person was a large part of your upbringing. What was their role in your life, and how did it make you into the person you are today?",
  ],
  Lover: [
    "You two met in an unexpected way. Where were you, and what happened?",
    "What personal difficulty have you two recently navigated together?",
    "You love this person but they don't love you back. How has this affected your relationship?",
    "You keep your love a secret. Why?",
    "You once did something terrible to protect this person. What did you do, and do they know?",
    "Your family doesn't approve of your relationship with this person. Why?",
  ],
  Mentor: [
    "You admire this person above all others. What makes you feel this way?",
    "This person once taught you a valuable lesson. How did they do it, and why?",
    "This person brought you into Candela Obscura. How did they convince you to join?",
    "You resent your membership in Candela Obscura. What does this person hold over you to keep you coming back?",
    "This person once saved your life. What happened?",
    "What lie did this person teach you about the world? Do they know you've uncovered the truth?",
  ],
  Muse: [
    "What about this person drives you to pursue your dream?",
    "This person lights up every room they walk into. What do they do that draws the attention of others?",
    "You would do anything for this person. What history do you share that makes you so devoted?",
    "This person has inspired you to change something specific about your life. What was it?",
    "Something about this person fascinates you. What is it, and have you told them?",
    "This person fuels an obsession of yours that you find dangerous. What is it, and why do you still keep them in your life?",
  ],
  'Old Friend': [
    "Growing up together, what did you two always get in trouble for?",
    "You've seen this person change over the years. How are they different from the person they once were?",
    "You once had a terrible fight with this person. What from that fight still weighs on you today?",
    "There once was a third person in your friendship. What happened to them?",
    "You come from the same home or background. What drove you both away from that shared history?",
    "There was a long period during which you two did not speak. What happened, and why are you interacting again?",
  ],
  Rival: [
    "You've been in competition for years now. What drives you to best one another?",
    "There is something you secretly admire about your rival. What is it, and why will you never tell them?",
    "You both share an ally that seems in conflict with your rivalry. Who is it, and why are you tied to them?",
    "Your rival is much better at a particular skill than you are. What is it, and how does this change your behavior?",
    "If your rivalry ended, you would still want this person in your life. Why is that, and what do you do to stay tied to them?",
    "You once grievously harmed each other. What harm did you inflict, and how did it change your relationship?",
  ],
  Sibling: [
    "You're so close that you're practically of one mind. Still, what do you hide from them?",
    "You two couldn't be more different. What's one thing you never agree on?",
    "You two have another sibling. Why are you estranged from them?",
    "You two share a number of secrets, but you protect one above all others. What are you hiding?",
    "This person once asked you to do something against your morals. What was it, and did you fulfill their request?",
    "You call yourselves siblings, but you're not related by blood. What is the true nature of your relationship, and why do you lie?",
  ],
  Soulmate: [
    "What do you see in this person that they don't see in themselves?",
    "What characteristic of this person do you find endearing, but others find odd?",
    "Because of your closeness with this person, you've lost someone else you love. How has this affected your relationship?",
    "You believe this person is your soulmate but they don't know. What keeps you from being open with them?",
    "You and this person belong together, but something in your lives drives you apart. What is the cause of this opposition?",
    "Time with this person feels like coming home. What about them makes you feel this way?",
  ],
  Stranger: [
    "You have no history, but feel you can trust this person. Why?",
    "A characteristic about this person seems so familiar. Who from your past do they remind you of?",
    "What about this person feels magnetic to you?",
    "Though you've never met, you share something with this person. What is the connection, and how do you feel about it?",
    "You have a secret this person must not learn. What is it, and what do you do to protect it?",
    "This person has something you want. What is it, and how do you plan to acquire it?",
  ],
  Ward: [
    "Why did you decide to financially support this person?",
    "You fundamentally disagree about something important. What is it, and why do you care for them anyway?",
    "You feel the need to protect this person. What is the threat, and what actions do you take to ensure their safety?",
    "You once had a different ward. What happened to them, and what does this person do that reminds you of them?",
    "You can no longer support this person in the way you once did. What changed, and how have you reacted?",
    "For all you provide, this person does something particularly wonderful for you. What is it, and how has it affected your life?",
  ],
};

export const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_DATA);

// A relationship's lore is the prompt question it answers, if one was chosen, then the
// answer on the next line. The form keeps the two apart (the question as an index), and
// joins them only to send: it used to paste the question into the answer box, where a
// tap in the middle of it typed the answer into the question (playtest,
// relationship-question-in-answer).
export const joinLore = (relType, promptIdx, answer) => {
  const question = Number.isInteger(promptIdx) ? RELATIONSHIP_DATA[relType]?.[promptIdx] : null;
  const text = (answer || '').trim();
  return question ? (text ? `${question}\n${text}` : question) : text;
};

// The other way: { promptIdx (or null), answer } of a stored lore, for a form that
// starts from it (Counter, Edit)
export const splitLore = (relType, lore) => {
  const text = lore || '';
  const idx = (RELATIONSHIP_DATA[relType] || []).findIndex(q => text.startsWith(q));
  if (idx < 0) return { promptIdx: null, answer: text };
  return { promptIdx: idx, answer: text.slice(RELATIONSHIP_DATA[relType][idx].length).trim() };
};
