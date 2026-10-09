# Candela VTT playtest: the handbook

A Lightkeeper (the game master) and four players play a session of Candela Obscura on the
Candela VTT, a web app built for that game, to find bugs, rules mistakes, confusing spots and
ideas for improvement. You are one of them. Everything you notice gets logged.

- The site: $SITE_URL, http://127.0.0.1:4300 by default (a private copy of the build under test, with a fresh database and nobody else on it).
- Folder: `$PT`, wherever this playtest folder was set up (all commands below run from there: `cd $PT`).
- Source code (read-only, for understanding what you see): the checkout of the build under test, `$SRC` (frontend/src, backend/vtt). The rules as the site implements them: `FAQ.md` there. Never edit anything in it.

## Seats

Each seat is a browser that stays open for the whole session, logged in as that person, the
way a real player's tab would. You drive yours with `seat.js`.

| seat | who | screen |
|---|---|---|
| dm | the Lightkeeper | laptop 1440x900, mouse |
| ada | Ada, a player | desktop 1920x1080, mouse |
| bram | Bram, a player | phone 390x844, touch |
| cass | Cass, a player | laptop 1366x768, mouse |
| dev | Dev, a player | tablet 820x1180, touch |

Personas are in `personas.md`. Play yours.

## Driving your browser: seat.js

```
node seat.js <seat> look [label]        # screenshot + outline of the screen. ALWAYS Read the png it prints.
node seat.js <seat> click button:Sign in
node seat.js <seat> click button:Roll --tap      # on a touch seat (bram, dev), tap (a real touch) instead of click
node seat.js <seat> fill textbox:Username "Ada Quill"
node seat.js <seat> press Enter
node seat.js <seat> select combobox:Action "Survey"
node seat.js <seat> scroll 600
node seat.js <seat> errors              # console errors, crashes, failed requests since you last asked
node seat.js <seat> ws 15               # the last WebSocket messages your desk sent and received
node seat.js <seat> run my_script.js    # for anything fiddly (drawing, dragging, timing): module.exports = async ({ page, shot, log }) => {...}
node seat.js <seat>                     # the full command list
```
Targets: `button:Name`, `link:Name`, `tab:Name`, `checkbox:Name`, `textbox:Name`, `combobox:Name`,
`heading:Name`, `label:Text`, `text:Text`, `placeholder:Text`, `css:.selector`, or any Playwright
selector. Names match a substring, case-insensitive (`button:=Roll` for exact). When several
elements match, the error lists them: pick one with `--nth N`. Scripts you write go in
`scripts/<seat>_*.js`.

On the phone seat the page is 390 wide and about 705 tall (the rest of the 844 is the browser's own bars, as on a real phone).

The outline comes from the accessibility tree: what a screen reader would announce. If
something you can see in the screenshot has no name in the outline, or a button is announced
with a name that does not say what it does, that is a finding too (kind ux).

## Talking at the table: table.js

The site carries the mechanics; the table talk (narration, "I search the desk", questions,
jokes) goes here, the way people talk out loud around a real table.
```
node table.js say ada "I hold the lantern up to the wall. Can I Survey it for markings?"
node table.js read --last 30
```
Speak in character, briefly. The Lightkeeper narrates and asks for rolls here; do what is asked
on the site.

## Logging what you find: finding.js

Log each thing **the moment you notice it**, one problem per finding:
```
node finding.js --seat bram --kind bug --sev high --title "Roll button does nothing on the phone" \
  --where "player desk, dice tray, phone" --steps "1. ... 2. ..." --expected "..." --actual "..." \
  --shots shots/bram/014_roll.png,shots/bram/015_after.png
node finding.js --list            # what everyone has logged so far
```
- kind: `bug` (broken or wrong), `rules` (the site disagrees with Candela Obscura's rules),
  `ux` (works, but confusing, slow, hidden, awkward, hard to read or to tap), `idea` (an
  improvement or something missing), `praise` (works well: keep it).
- sev: `high` (blocks play, loses data, or shows a wrong number), `medium` (a visible defect or
  real friction in a common case), `low` (a nit).
- Check `--list` first. If someone already logged it, log it again only if it is different on
  your device or in your situation, and say "same as F012 but on the phone".
- After anything that fails or surprises you, run `errors` and put what it shows in the finding.
- Screenshots: give the paths `look` printed. Look at them yourself first.
- Write findings so a developer who was not there can reproduce them.

## Rules of conduct

1. Play through the site like a person. No API calls or database writes to play. You may read
   the API, the database (`psql -h localhost -p 5433 -U postgres candela_playtest` in the first run) or the
   source to check a suspected bug; say so in the finding.
2. **Do not reload your page** unless your persona, your instructions or the step needs it.
   Whether your desk stays current on its own (other people's rolls, the Lightkeeper's changes)
   is part of what is being tested. At the start of each turn, `look` first and check that
   your screen shows what has happened since your last turn (the table talk tells you what
   happened). Anything stale is a bug. If you have to reload to carry on, log what was stale.
3. Only drive your own seat. Never close your last tab, never kill or restart any process
   (servers, the seats daemon), never edit repository files.
4. Look at every screenshot before you act on it or report it.
5. Keep your memory file `memory/<seat>.md`: read it at the start of every turn, and before
   you finish append a short entry: what you did, your investigator's current state (drives,
   resistances, marks, scars, gear), what you are watching for, open threads. The next turn
   starts from it, so make it enough to carry on.
6. Your account: username as in personas.md, password `correct-horse-battery-staple`, email
   `<username>@example.test`. Registration allows 5 a minute for everyone together: if it says
   too many, wait 65 seconds and try again (that is not a bug).

## The game in brief

Candela Obscura (Darrington Press): investigators in a secret society face the supernatural.
To act, a player picks an action (Move, Strike, Control, Sway, Read, Hide, Survey, Focus,
Sense) and rolls d6s equal to its rating, plus dice for drive points spent from the matching
drive (Nerve for Move/Strike/Control, Cunning for Sway/Read/Hide, Intuition for
Survey/Focus/Sense). Highest die counts: 6 full success, 4-5 mixed, 1-3 failure, two 6s a
critical. A rating of 0 rolls two dice and keeps the lower. Gilded dice let the player choose.
Resistance (per drive) can be burned to reroll. Harm comes as marks (Body, Brain, Bleed); the
third mark of a kind becomes a scar; the fourth scar kills. The circle shares resources
(Stitch, Refresh, Train) and an Illumination track; when it fills, the circle advances. The
Lightkeeper sets scenes, calls for rolls, gives marks and raises tension (the hourglass).
The site's version of every mechanic is in FAQ.md.
