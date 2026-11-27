# Tone pass: Modules 0 to 3 (from the text export)

Coverage: all of Module 0, 2 and 3 and the home page read in full. Module 1: the Vectors card read in full, plus the metrics for all eight cards. Module 1 gets a full read in the pilot rollout.

## 1. Verdict
The content is precise and well structured, and the Meaning stage is often genuinely good (glasses of water, rubber sheet, dough, photocopier). The "machine-written" feeling comes from four things, none of which is the maths:

1. **The skeleton shows.** Every card repeats the same labelled lead-ins: "The requirement. / Obvious candidate. / Why it fails." "Recognition rule." "When it does not fit." "Simplified." The structure is fine; the lead-ins are being used instead of sentences.
2. **Nobody is speaking.** Stages 5, 6, 7 and the card headers are written in the passive, third-person voice of a specification.
3. **Process talk leaks into lessons** (list in section 3).
4. **It gets more mechanical as the course goes on.** The "you/your" rate per 1,000 words, averaged by module: Module 0 is about 10, Module 1 about 7, Module 2 about 8, Module 3 about 5. The Module 3 cards that carry the hardest ideas have the lowest warmth: Determinant 3.7, Eigenvectors 4.2, SVD 3.6. Hard cards need more of a tutor, not less. (Counts are from the export; the many "questions" per page are mostly the Spot it and Predict prompts, not a tutor asking.)

## 2. What to keep (the benchmark)
Variables "labelled empty box", Equations "pour 4 litres into two glasses", Eigenvectors "push on a rubber sheet", SVD "press a round lump of dough", the Teach it 60-second scripts. These already sound like a person. Aim every Meaning and every Teach it at this level.

## 3. Process talk to remove from lessons
- "the site's tests check this on hundreds of random pairs" (Dot product, 01)
- "the tests confirm it on hundreds of random pairs" (Projections, 06)
- "What the tests do. They try thousands of random rank-k matrices..." (Low-rank, 06)
- "Every number in this table comes from tested code" (Eigenvectors, 05)
- "With 4,000 random pairs and a fixed seed, the measured spreads were..." (Orthogonality, 07); same style in Why divide by √d_k, 07
- "(a suggestion, not a lock)" on every "Builds on" line. Say it once in the site hint.
- "this card" appears 2 to 5 times per page; "This card makes no claim", "Nothing specific to claim" and "Conceptual link only" repeat the same hedge in legal tone.

Precision stays: these facts remain in docs/CLAIMS.md. The reader just doesn't need the machinery.

## 4. Things I found that are real bugs, not tone
1. **Angle and cosine, worked example:** "‖b‖ = √2.0000000000000004 ≈ 1.414". A floating-point value leaked into the text. It should read "√2 ≈ 1.414". Format displayed numbers with rounding.
2. **Angle and cosine, 06 reasoning:** starts "1. The angle between an arrow and itself..." which reads as a list marker. Write "It is 1. The angle between..."
3. **Low-rank, picture text:** "at rank 264 storing the layers takes more numbers..." The 8 and the 264 look glued together ("at rank 8, storing the layers takes 264 numbers"). Check in the browser; the export may have dropped a separator, but verify.
4. **Forward reference, Orthogonality (card 5):** uses "variance 1/d", and variance is first explained in card 7. The glossary popover softens it, but it breaks the backward-only rule. Rewrite without the word (see section 6).
5. **Forward reference, Eigenvectors and SVD:** SVD says "the next card gives one documented use". Rewrite backward-only.
6. **Typography:** "-1" and "-3" with a hyphen in places, "−" elsewhere. Use the real minus sign throughout.
7. **Grammar:** Sigma analogy, "a receipt lines are arbitrary prices" should be "a receipt's lines".
8. **Module cards in static HTML:** computed numbers are empty without scripts (known gap; the export also shows this).

## 5. Rules to apply (adds to VOICE.md)
- Keep the **bold lead-in labels** as navigation, but write full sentences after them.
- Stage 6: tell it as a short story ("Suppose you had to design this yourself...") with the prediction at the pivot. Keep the Derived / Motivated / Convention tag and the exact logic.
- Stage 7: say the connection once, positively. If there is no direct link, say so in one warm, honest sentence and say why the idea is still here.
- Objectives: one idea per line, under about 25 words.
- Every hard card gets one sentence naming the difficulty ("This is the idea people find hardest in the module; take the sliders slowly.").
- Every card opens its stage 1 by touching something the reader has felt, and every module overview says what you can now do that you couldn't before.
- Cross-references: "Remember the shadow from the Dot product card?" beats a bare "Builds on".

## 6. Passage-level rewrites
Each keeps every number, definition and source from the original.

**Home hero**
Before: "Learn it alone, then explain it to someone else. Each idea starts from a picture, adds the notation, and ends with where it shows up in a large language model."
After: "You can learn the maths inside machine learning one idea at a time. Each idea starts with a picture you can drag around, then adds the symbols, then shows exactly where it appears in a large language model. Work through it alone, then try explaining it to someone else. That is how you find out you really have it."

**Module 2 overview**
Before: "...Seven ideas, each from a picture first, then the symbols, then where it shows up inside a language model."
After: "You now know what arrows are and what matrices do to them. This module asks the questions a model asks constantly: how long is this arrow, how far apart are these two, do they point the same way? Seven ideas, and the last one explains a small mystery in the original Transformer paper: why attention scores get divided by √d_k."

**Norms, 05 Why and when**
After: "Sooner or later you need one number for 'how big is this?': how large are a model's weights, how far off was a prediction? That is what a norm is for. Which one should you pick? L2 squares each entry first, so one big entry dominates, and it is the one that works with angles and the dot product. L1 counts each entry in proportion to its size, so a single large entry sways it less. Neither is 'the' length; they answer slightly different questions. And a norm tells you how big, never which way: two very different arrows can have the same length."

**Dot product, 01 (leak removed)**
Before: "...The two formulas always give the same number (the site's tests check this on hundreds of random pairs)."
After: "The two formulas always give the same number. Check it with the sliders below."

**Equations, 06 How to arrive at it (story form, still Derived)**
After: "Suppose you had to say 'the two glasses always hold 4 litres together' without picking any numbers. You could list pairs: 0 and 4, 1 and 3, 2.5 and 1.5. But once fractions are allowed the list never ends. You could write a sentence, but you cannot calculate with a sentence. What you want is something shorter than a list and sturdier than a sentence." Then the prediction and the existing reasoning, unchanged.

**Projections, 06, last bullet**
After: "Check. By construction the leftover is orthogonal to b. Try a few pairs in the picture and watch the corner mark stay put."

**Low-rank, 06, last bullet**
After: "A sanity check, not a proof. We tried thousands of random rank-k matrices against this one and none came closer. That is evidence; the proof is in MML Ch 4.6."

**Eigenvectors, 05 (table intro)**
After: "Here are all the 2×2 cases in one table. The discriminant tr² − 4 det tells you which row you are in."

**Eigenvectors, 07**
Before: "Nothing specific to claim. ... this card makes no claim that they are."
After: "An honest note: eigenvectors are not a named step inside a transformer, and we won't pretend otherwise. The idea earns its place as a tool for understanding matrices, and the real uses are the ones above: vibration, spinning bodies and PageRank."

**Determinant, 07**
After: "Worth knowing: only a square matrix has a determinant, and many of a transformer's learned matrices are not square. In the original base model, queries, keys and values come from learned projections from 512 entries down to 64 per head, a 64×512 table (Vaswani et al., 2017, §3.2.2). That table has no determinant and cannot be undone. So the determinant is not a named step in running a language model; it is a tool for reasoning about matrices."

**Orthogonality, 07 (no variance, no process)**
After: "Draw two directions at random, evenly over all directions. Their cosine averages 0, and its typical size is about 1/√d: roughly 0.125 for d = 64 and 0.044 for d = 512. A quick simulation agrees. So in a space with hundreds of dimensions, two random directions are nearly at right angles, which is why such spaces have room for many directions that barely interfere." Keep the Simplified note (random, not learned).

**Eigenvectors, objectives (shortened)**
- "Define an eigenvector and eigenvalue by Av = λv with v not zero, and say why only the direction matters"
- "Find a 2×2 matrix's eigenvalues from its trace and determinant, and use the discriminant to count the real ones"
- "Recognise the standard cases (projection, scaling, rotation, shear) and check that the eigenvalues add to the trace and multiply to the determinant"

**Variables, 05**
After: "Without variables you would need a separate sentence for every case: '3 times 4, plus 2', '3 times 5, plus 2', and so on. One letter lets a single statement cover them all. Reach for one whenever a rule should work for many numbers. If you only ever need one number, just write the number."

**Variables, 07**
After: "Here is the surprise: a language model is, at bottom, one gigantic expression full of empty boxes. The boxes are called parameters. Training is the search for the number to put in each one, and GPT-3 (2020) has 175 billion of them (Brown et al., 2020)." Keep the Simplified note.

**Header line**
Before: "Builds on: Dot product (a suggestion, not a lock)"
After: "Before this: Dot product" (one line in the site hint says nothing is locked).

## 7. Rollout
1. Pilot: Variables and Eigenvalues and eigenvectors, full rewrite using the above. You compare side by side.
2. Fix the section 4 bugs now; they are independent of voice.
3. Then module by module (0, 1, 2, 3). Per card: rewrite stages 1, 5, 6, 7, objectives and headers; leave maths, numbers, sources, widgets and checks alone.
4. Content-preservation fixtures are regenerated deliberately with a hash and a note. CLAIMS.md is updated where wording changed.
5. Advisory voice lint: flags "this card", "tested", "makes no claim", "clearly", "simply", and any page whose "you" rate drops below about 6 per 1,000 words.
6. Test the pilot on about three real learners before rolling out.

## 8. Limits of this pass
- Based on text only. I have not seen the pages, widgets or how the labels look.
- The "you" rate is a rough signal, not the goal. Aim for natural, not a quota.
- Module 1 beyond the Vectors card is unread; the numbers suggest it follows the same pattern.
