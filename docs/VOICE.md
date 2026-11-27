# VOICE.md: how the ML Math course talks

## 1. The promise
Two things hold at once, always:
1. **Precision never loosens.** Every definition, number, and claim is as exact as before.
2. **It sounds like a person teaching you.** Warm, direct, and built on things you have already felt or seen.

Warmth is delivery. It never replaces content. If a sentence gets friendlier but less exact, it is a worse sentence.

## 2. The speaker
A patient, sharp tutor sitting next to you with a pencil. They know the subject well, remember not knowing it, and never make you feel slow. They say "you" and "we". They use "I" sparingly, only for a real choice ("I'll call this the shadow").

Not: a textbook, a spec sheet, a checklist, or a build log.

## 3. What the research says (and its limits)
- **Personalization principle (Mayer).** Conversational style ("you", "we", "let's") beat formal style in 11 of 11 experiments reviewed, median effect about d = 1.1, mostly on transfer (using the idea in new situations), not recall. Effects are largest for beginners and shrink when overdone. So: conversational, not chatty.
- **Concreteness fading (Fyfe, McNeil, Son, Goldstone, 2014).** Start with a concrete, familiar case, then bridge to the abstract notation, then state the general form. This is our Meaning, Picture, Real life, Worked example order.
- **Expert blind spot (Nathan and Petrosino, 2003; Wieman).** Experts forget which steps were hard. Cure: write each step down, say why it is allowed, and test against a real beginner.
- **How good explainers sound.** 3Blue1Brown: picture first, let the learner feel the idea is theirs. Gilbert Strang: asks questions out loud, admits what is surprising, keeps a human voice. StatQuest: tiny steps, a clear storyline, "simple without dumbing down".
- **Limit.** These studies are mostly short lab lessons, not a long web course. Treat the rules as a strong default, and confirm with real learners (section 10).

## 4. Twelve rules
1. **Talk to one person.** "You", "we", "let's". Never "the learner", "one should", "it can be seen that".
2. **Start from something they have felt.** Water in a bath, a ramp, a phone battery. Then name the idea.
3. **Say why before what.** Give the problem that forces the idea, then the idea.
4. **One idea per paragraph, one sentence of setup per step.** Short sentences for hard ideas.
5. **Narrate the worked example.** "Now we multiply by 2, because the second row doubles." Never a bare list of steps.
6. **Name the confusing moment.** "This is where people trip: ..." Admitting difficulty is warm and accurate.
7. **Ask a question, then answer it.** One or two per card, real ones a learner would ask.
8. **Symbols arrive after meaning, and get read aloud.** "x-sub-i means the i-th entry."
9. **No process talk.** The reader never hears about checks, tests, the build, or the card template.
10. **Warm is not padded.** No cheerleading ("Great job!"), no filler ("It is worth noting"). Every sentence teaches or connects.
11. **Use natural contractions in prose.** "Doesn't", "that's", "you'll", "let's", "won't". Keep definitions, formulas, formal statements and sourced claims uncontracted, because they are read as statements of record. Example: "Here's where people trip: 3x isn't one new symbol." Next to the definition: "A variable is a name for a number we have not picked yet." Contractions never replace a possessive: "the card's idea" is not a contraction.
12. **Ask the question aloud, then link back in the text.** Before a step that needs a reason, ask the question a learner would ask, answer it in one sentence from facts already on the card, and point back to the earlier card that made the idea (links go backward only). Example: "Why do we want A − λI to have no inverse? Because an eigenvector is not zero, and a matrix with an inverse only sends the zero vector to zero. ... Remember the Determinant card: a determinant of 0 meant the square got squashed and nothing could undo it."

## 5. The precision contract (never traded for warmth)
- Definitions keep their exact mathematical meaning. Plain language sits beside the formal statement, not in place of it.
- Every number comes from tested code. Every factual claim stays in docs/CLAIMS.md with its tag.
- Simplifications are named where made ("this is true for 2x2; larger matrices need more care").
- An analogy always states where it breaks.
- "In an LLM" claims keep their sourced or Conceptual label.
- If a rewrite changes a claim's wording, update CLAIMS.md in the same commit.

## 6. Voice by stage
| Stage | Voice | Typical opening |
|---|---|---|
| 1 Meaning | A tutor explaining aloud, one image, then the notation | "Picture a ..." |
| 2 Picture | Guiding the eye and the hand | "Drag the arrow and watch ..." |
| 3 Real life, Spot it | Recognition from daily life, an invitation | "You have met this already: ..." |
| 4 Worked example | Narrated, each step justified | "Let's do one together." |
| 5 Why and when | Honest about limits, a colleague's advice | "You reach for this when ..." |
| 6 How to arrive | Rediscovery, the learner inventing it | "Suppose you had to design this yourself." |
| 7 In an LLM | Calm and exact, sourced, no hype | "In a transformer, ..." |

## 7. Friendly but plain headings (optional)
Keep the seven stage names for navigation, but allow a short human subtitle under each when it helps ("Meaning: what is it, really?"). Never replace the stage name.

## 8. Drop these
- "It can be shown that", "clearly", "obviously", "trivially", "simply", "just".
- "The learner will be able to", "this card", "this section aims to".
- Noun-stack sentences ("computation of the normalisation of the aggregated score").
- Passive voice where a person can act ("we compute", not "is computed").
- Claims of difficulty or ease on the reader's behalf ("this is easy").
- Anything about verification, tests, or the site's own machinery.

## 9. Before and after
**Machine voice:** "The dot product of two vectors is defined as the sum of the products of corresponding components."
**Tutor voice, same precision:** "Line up two lists of numbers, multiply each pair, and add the results. That total is the dot product. It tells you how much the two arrows point the same way: big and positive when they agree, zero when they are perpendicular, negative when they oppose."

**Machine voice:** "An eigenvector v of matrix A satisfies Av = λv."
**Tutor voice:** "Most arrows get knocked off their line when a matrix acts on them. A few special ones don't: they stay on their line and only get longer or shorter. Those are eigenvectors. In symbols, Av = λv, where λ is the stretch factor. (The zero vector is excluded, since it trivially satisfies this.)"

**Machine voice:** "This concept is used in LLMs."
**Tutor voice:** "Here is where it shows up in a transformer: each attention score is a dot product of a query and a key (Vaswani et al., 2017, section 3.2)."

## 10. Applying it
1. **Pilot:** rewrite Variables and Eigenvalues and eigenvectors in full, side by side with the originals.
2. **Test:** show three real learners the pilot cards; ask where they stalled and what sounded stiff.
3. **Roll out** module by module. Content-preservation fixtures are regenerated deliberately, with a hash and a note, never silently.
4. **Update** docs/CLAIMS.md wherever wording changed.
5. **Lint (advisory only):** flag the words in section 8, "the learner", and process words on every page. A warning, not a failure.
6. **Embed** this guide in the module-session and new-concept-card skills so new cards start in this voice.
7. **Computed numbers** should be present in the static HTML, not only injected by script, so the first paint is not empty.
8. **Module 4 waits** until the pilot is approved.

## 11. Per-card checklist
- [ ] Opens with something the reader has experienced.
- [ ] "You" or "we" appears naturally; no "the learner".
- [ ] Every symbol is read aloud when introduced.
- [ ] Prose uses natural contractions; definitions and formulas do not.
- [ ] The hardest step is preceded by a question asked aloud, with a backward link where an earlier card applies.
- [ ] The worked example is narrated with reasons.
- [ ] At least one named trip-up.
- [ ] The analogy states where it breaks.
- [ ] No filler or process words.
- [ ] Every claim, number, and definition is as exact as before (diff against the old card).
- [ ] CLAIMS.md updated if wording changed.
