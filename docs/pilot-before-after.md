# Voice pilot: before and after

Two cards, rewritten in the voice of `docs/VOICE.md`, starting from `docs/TONE-PASS.md` section 6. Branch `voice-pilot`. The original text is taken from commit `4b98d5d` (what is on `main`).

**Scope.** Tagline, objectives, stages 1, 5, 6 and 7, takeaways, Teach it, Predict hints, and the “Before this” line. Nothing else changed: no number, formula, symbol, citation, provenance tag, worked-example value, widget, check question or answer, glossary term, table, or the seven-stage structure.

**How to read it.** Each part shows the old text on the left and the new on the right. “CHECK” marks a place where the meaning, not only the wording, could have shifted. Where I was unsure, I kept the original wording or said so.

**“Before this” line (site-wide).** Every card’s meta line now reads “Before this: Dot product” instead of “Builds on: Dot product (a suggestion, not a lock)”. The “nothing is locked” sentence moved to the first-visit hint and to “How to use this site” on the home page.

**Metrics** come from `tools/export-text.mjs` on the rendered page (JavaScript on), so they include objectives, takeaways and checks.

**Second pass (this version).** Four fixes you gave, then: natural contractions in prose (not in definitions, formulas, stage 7 or the Simplified notes); one question asked aloud in Variables stage 5 and one in Eigenvectors stage 6; and a backward link to the Determinant card. The rules went into `docs/VOICE.md` as rules 11 and 12.

**Contraction counter.** The export already counted the curly apostrophe (’), but it also counted possessives (“card’s”), which are not contractions. It now counts n’t, ’re, ’ve, ’ll, ’d, ’m and the ’s of it, that, there, here, let, what, who, where, how, he and she. “Before” below is recomputed with the corrected counter on the original pages (under the old counter it was 2 and 2).


## Variables and expressions (`m00-variables`)

| | Words | “you/your” | per 1,000 words | Contractions |
|---|---|---|---|---|
| Before | 753 | 7 | 9.3 | 1 |
| After | 906 | 15 | 16.6 | 8 |


#### Tagline

| Before | After |
|---|---|
| A letter is a labelled empty box that a number can go into. | A letter is a labelled empty box, and you can put a number in it. |

**What changed.** “A number can go into it” became “you can put a number in it”. Same claim, said to the reader.


#### “By the end of this card” (objectives)

| Before | After |
|---|---|
| Explain a variable as a labelled box that holds a number<br><br>Evaluate a simple expression for a given value | Say what a variable is: a labelled box that holds a number<br><br>Work out the value of a simple expression once you are told which number is in the box |

**What changed.** Verbs made plainer (“Say what a variable is”, “Work out the value”). The second objective now says what “a given value” means: you are told which number is in the box.

**CHECK.** Objective 2 reads “once you are told which number is in the box” where the original said “for a given value”. I believe that is the same thing; flagged because the wording is no longer identical.


#### Stage 1 Meaning

| Before | After |
|---|---|
| Imagine a box with a label on it and nothing inside yet. That is a variable: a name for a number we have not picked. Put 4 in the box and every place the label appears means 4. Put 10 in and it means 10.<br><br>An expression is a recipe that uses the box. Our example is “three copies of the box, plus 2”. We write it 3x+2. When a number sits next to a letter, the multiplication sign is hidden: 3x means 3 × x. | Think of an empty box with a label stuck on the front, like a moving box marked “kitchen”. The label is a name, and the box is waiting for something to go in it. (A real moving box holds many things; this box holds one number at a time.) A variable works the same way: it is a name for a number we have not picked yet. Put 4 in the box and every place the label appears means 4. Put 10 in and it means 10.<br><br>Let’s put the box to work. An expression is a recipe that uses the box. Ours says “three copies of the box, plus 2”, and we write it 3x+2. Read it aloud as “three x plus two”.<br><br>Here’s where people trip: when a number sits next to a letter, the multiplication sign is hidden. So 3x isn’t one new symbol. It means 3 × x. |

**What changed.** Opens with a box you have seen (a moving box with a label), says where the picture stops (“A real moving box holds many things; this box holds exactly one number”), reads 3x+2 aloud, and names the one place people trip. Contractions added in prose (“Let’s”, “Here’s”, “isn’t”); the definition sentence stays uncontracted.

**CHECK.** The parenthesis now says the box “holds one number at a time”, as you asked. That fits the card: at any one moment the box has one number, and Teach it says the letter can be filled with different numbers to see what happens.

**CHECK.** “Let’s put the box to work”, “Here’s where people trip” and “isn’t one new symbol” are new contractions in a sentence that used to say “This is where people trip” and “is not”. Meaning is unchanged.


#### Stage 5 Why and when

| Before | After |
|---|---|
| Without variables you would write a separate sentence for every case: “3 times 4, plus 2”, “3 times 5, plus 2”, and so on. A variable lets one statement cover every case at once.<br><br>Use one whenever a rule should hold for many numbers. If you only ever need one specific number, just write the number. | Why bother with a letter at all? Without variables you’d need a separate sentence for every case: “3 times 4, plus 2”, “3 times 5, plus 2”, and so on. One letter lets a single statement cover every case at once.<br><br>Reach for a variable whenever a rule should hold for many numbers. If you only ever need one specific number, write the number itself. |

**What changed.** From TONE-PASS section 6, with “just write the number” changed to “write the number itself” (“just” is on the drop list).


#### Stage 6 How to arrive at it

| Before | After |
|---|---|
| [tag: ◆ Convention]<br><br>Any mark could stand for the box: a square, a star, the letter k. We could have chosen differently, and the maths would not change. The habit is to use letters from the end of the alphabet (x, y, z) for quantities that vary and letters from the start (a, b, c) for fixed numbers we have not specified. | [tag: ◆ Convention]<br><br>Suppose you had to choose a mark for the box yourself. A square would work, and so would a star, or the letter k. We could have chosen differently, and the maths wouldn’t change.<br><br>In practice the habit is to use letters from the end of the alphabet (x, y, z) for quantities that vary and letters from the start (a, b, c) for fixed numbers we have not specified. |

**What changed.** Turned into a short invitation (“Suppose you had to choose a mark yourself”), then the habit about letters. Still tagged Convention. The second paragraph now starts “In practice”.


#### Stage 7 In an LLM

| Before | After |
|---|---|
| Every number a language model learns is a variable, called a parameter, until training fixes its value. The model is a very large expression made of those variables. GPT-3 (2020) has 175 billion of them (Brown et al., 2020).<br><br>**Simplified.** A real model's expression is enormously bigger than 3x + 2, but it is built from the same pieces: numbers, variables, multiplication and addition (plus a few other operations). | In a language model, every number the model learns is one of these empty boxes. It is called a parameter, and it stays a variable until training fixes its value. The model as a whole is a very large expression made of those variables. GPT-3 (2020) has 175 billion of them (Brown et al., 2020).<br><br>**Simplified.** A real model's expression is enormously bigger than 3x + 2, but it is built from the same pieces: numbers, variables, multiplication and addition (plus a few other operations). |

**What changed.** Opens “In a language model”. The TONE-PASS rewrite said “a gigantic expression” and “training is the search for the number”; I kept the original, more careful wording (“a very large expression”, “until training fixes its value”) rather than the search image. The Simplified note is unchanged.

**CHECK.** TONE-PASS section 6 offered “Training is the search for the number to put in each one”. I did not use it: it adds a mechanism claim (a search) that the original did not make. Kept the original claim.


#### Key takeaways

| Before | After |
|---|---|
| A letter stands for a number that can change or is not yet known.<br><br>An expression is a recipe that turns the numbers in the boxes into a new number.<br><br>Naming things lets us state a rule once and use it for every value. | A letter stands for a number that can change, or one we don’t know yet.<br><br>An expression is a recipe: put numbers in the boxes and it gives you a new number.<br><br>Because the box has a name, you can state a rule once and use it for every value. |

**What changed.** Spoken to the reader (“put numbers in the boxes and it gives you a new number”). Each still says what it said.


#### Teach it

| Before | After |
|---|---|
| **Everyday analogy**<br><br>A form with blanks: “Dear ____”. The blank stands for whatever name you fill in. *Where it breaks down:* a blank on a form is filled once, but a letter in maths can be filled with different numbers to see what happens, and the same letter means the same number everywhere in one problem.<br><br>**Common misconception**<br><br>“x always means the same number.” It does not. x is a placeholder; its value is whatever the problem says or whatever we choose for the moment. | **Everyday analogy**<br><br>Think of a form with blanks, like “Dear ____”. The blank stands for whatever name you fill in. *Where it breaks down:* a blank on a form is filled once, but a letter in maths can be filled with different numbers so you can see what happens, and within one problem the same letter means the same number everywhere.<br><br>**Common misconception**<br><br>“x always means the same number.” It doesn’t. x is a placeholder, and its value is whatever the problem says or whatever you choose for the moment. |

**What changed.** Analogy opens “Think of a form with blanks”; the “Where it breaks down” caveat is kept in full. The misconception now says “you choose” instead of “we choose”.


#### Predict hint(s)

| Before | After |
|---|---|
| Replace x with 5, do the multiplication first, then the addition. | Put the 5 into the box, in place of x. Then multiply first and add after. |

**What changed.** Reworded so it says where the 5 goes. The order (multiply first, then add) is unchanged.


**Facts preserved.** Every number (4, 10, 3, 2, 5, 175 billion, 2020), every formula (3x+2, 3x, 3×x), the citation (Brown et al., 2020), the MML Ch 1 reference, the Convention tag, the Simplified caveat, the “Where it breaks down” caveat, the bold lead-ins (Recognition rule, Spot it, Simplified), the glossary terms and the Spot-it and Predict questions are all unchanged. Checked by tests/facts-preserved.test.mjs: no differences, no exceptions needed.


## Eigenvalues and eigenvectors (`m03-eigenvectors`)

| | Words | “you/your” | per 1,000 words | Contractions |
|---|---|---|---|---|
| Before | 1705 | 7 | 4.1 | 1 |
| After | 1952 | 18 | 9.2 | 12 |


#### Tagline

| Before | After |
|---|---|
| Directions that a transformation only stretches, shrinks or flips, and what to do when there are none. | Arrows that a transformation keeps on their own line: it only stretches, shrinks or flips them. And what to do when there are none. |

**What changed.** Says what the arrows do (stay on their own line) and keeps the “what to do when there are none” promise.

**CHECK.** My first draft said “never turns”, which is wrong for a flipped arrow. Changed to “keeps on their own line”. Original said “directions”; I use “arrows” because stage 1 does.


#### “By the end of this card” (objectives)

| Before | After |
|---|---|
| Define an eigenvector and its eigenvalue by Av = λv with v not the zero vector, and explain why an eigenvector is defined only up to scale<br><br>Find the eigenvalues of a 2×2 matrix as (tr ± √(tr² − 4 det))/2 and use the discriminant to say whether there are two, one repeated, or no real eigenvalues<br><br>Name the standard cases: a projection (eigenvalues 1 and 0), a scaling, a rotation (no real eigenvector), and a shear (one eigenvector direction, a defective matrix), and check that the eigenvalues add up to the trace and multiply to the determinant | Define an eigenvector and its eigenvalue by Av = λv with v not the zero vector, and say why an eigenvector is only defined up to scale (2v and −3v work too)<br><br>Find the eigenvalues of a 2×2 matrix as (tr ± √(tr² − 4 det))/2, and use the discriminant to tell whether there are two, one repeated, or no real eigenvalues<br><br>Recognise the standard cases: a projection (eigenvalues 1 and 0), a scaling, a rotation (no real eigenvector), and a shear (one eigenvector direction, a defective matrix)<br><br>Check that the eigenvalues add up to the trace and multiply to the determinant |

**What changed.** Split three long objectives into four, one idea each. Objective 1 now says “why only the direction matters”. Objective 2 keeps the full formula and the exact three cases; the TONE-PASS shortening to “count the real ones” would have lost “one repeated”, so I did not use it.

**CHECK.** Objective 1: “why an eigenvector is defined only up to scale” became “why only the direction matters”. These say the same thing in this card (stage 1 explains it with 2v and −3v), but the second is less exact about scaling by any non-zero number.


#### Stage 1 Meaning

| Before | After |
|---|---|
| Push on a sheet of rubber so that it stretches and slants. Most lines drawn on it tilt to new directions. But some line may stay exactly where it was, as a line: points slide along it and never leave. An arrow lying along that line comes out pointing along the same line, longer, shorter or reversed. Such an arrow is an eigenvector of the matrix, and the factor by which it is stretched is its eigenvalue.<br><br>In symbols, A v = λv: applying the matrix A to v gives the same arrow multiplied by the number λ (the Greek letter lambda). We insist that v is not the zero vector, because the zero vector fits for every λ and tells us nothing. And only the direction matters: if v works then so does 2v, or −3v. Only a square matrix can have eigenvectors, because the output must live in the same space as the input. | Picture a sheet of rubber with a grid drawn on it. Push on it so that it stretches and slants. Most of the lines you drew tilt to new directions. But some line may stay exactly where it was, as a line: points slide along it and never leave it. An arrow lying along that line comes out pointing along the same line, longer, shorter or reversed. Such an arrow is an eigenvector of the matrix, and the factor by which it is stretched is its eigenvalue. The picture below lets you try this on a matrix yourself.<br><br>Now let’s put symbols on it. We write A v = λv and read it aloud as “A times v equals lambda times v”. In words: applying the matrix A to v gives the same arrow multiplied by the number λ (the Greek letter lambda). Three details go with it. First, v must not be the zero vector, because the zero vector fits for every λ and tells us nothing. Second, only the direction matters: if v works then so does 2v, or −3v. Third, only a square matrix can have eigenvectors, because the output must live in the same space as the input. |

**What changed.** Same rubber sheet. Adds a grid so “lines you drew” makes sense, says the symbols aloud (“A times v equals lambda times v”), and numbers the three side facts (v not zero, only the direction matters, square matrices only).

**CHECK.** “The picture below lets you try this on a matrix yourself.” The slider sets v and you pick a matrix; you do not push the sheet. Worded to match what the widget does.


#### Stage 5 Why and when

| Before | After |
|---|---|
| Eigenvectors turn a complicated transformation into one-dimensional pieces: along each eigenvector the matrix is just a number. For a 2×2 matrix the eigenvalues come from the trace and determinant: λ = (tr ± √(tr² − 4 det)) / 2, so their sum is the trace and their product is the determinant (⟨calc⟩ and ⟨calc⟩ for the worked example).<br><br>**When it does not fit.** The discriminant tr² − 4 det decides which case you are in. Every number in this table comes from tested code:<br><br>⟨table of cases, unchanged⟩<br><br>A rotation by an angle that is not a multiple of π has no real eigenvalues, because its tr² − 4 det is negative (here tr = ⟨calc⟩ and det = 1), and no real arrow keeps its line. The shear with k not 0 has its eigenvalue 1 repeated, and only the arrows along the x-axis stay on their line, so it has too few eigenvectors to span the plane. | You reach for eigenvectors when a transformation looks complicated and you want to break it into simple pieces. They turn it into one-dimensional pieces: along each eigenvector the matrix acts as a single number. For a 2×2 matrix the eigenvalues come from the trace and determinant: λ = (tr ± √(tr² − 4 det)) / 2, so their sum is the trace and their product is the determinant (⟨calc⟩ and ⟨calc⟩ for the worked example).<br><br>**When it does not fit.** Here are some 2×2 cases side by side in one table. The discriminant tr² − 4 det tells you which row you are in.<br><br>⟨table of cases, unchanged⟩<br><br>Let’s look closer at two rows. A rotation by an angle that is not a multiple of π has no real eigenvalues, because its tr² − 4 det is negative (here tr = ⟨calc⟩ and det = 1), and no real arrow keeps its line. The shear with k not 0 has its eigenvalue 1 repeated, and only the arrows along the x-axis stay on their line, so it has too few eigenvectors to span the plane. |

**What changed.** Opens “You reach for eigenvectors when…”. Process talk removed (“comes from tested code” is gone; the claim stays in CLAIMS.md). The table intro and the closing paragraph (“Two rows deserve a second look”) are mine. The table, the calc spans and the formula are untouched.

**CHECK.** The table intro is not the TONE-PASS wording (“all the 2×2 cases”). The table is five examples and has no scalar matrix, so “all” would overclaim. It now says “some 2×2 cases”.

**CHECK.** “along each eigenvector the matrix acts as a single number” replaces “is just a number”. Same meaning: it multiplies by λ.


#### Stage 6 How to arrive at it

| Before | After |
|---|---|
| [tag: ✓ Derived]<br><br>• **The requirement.** Find v, not zero, with A v = λv. Move everything to one side: (A − λI) v = 0, where I is the identity matrix.<br><br>• **What that demands.** The matrix A − λI sends a non-zero arrow to zero. A matrix with an inverse only sends the zero vector to zero, so A − λI must have no inverse: its determinant is 0.<br><br>• **Write it out.** det(A − λI) = (a − λ)(d − λ) − bc = λ² − (a + d)λ + (ad − bc) = λ² − tr λ + det.<br><br>• **Solve.** Set it to 0 and use the quadratic formula: λ = (tr ± √(tr² − 4 det)) / 2. For each λ, solve (A − λI) v = 0 for v. | [tag: ✓ Derived]<br><br>Suppose you had to find these special arrows yourself, starting from nothing but the rule A v = λv. The key move is to look at the matrix A − λI, where I is the identity matrix. Why do we want that matrix to have no inverse? Because an eigenvector is not zero, and a matrix with an inverse only sends the zero vector to zero, so A − λI has to send a non-zero arrow to zero, and that is only possible if it has no inverse. We’ll take it in four steps.<br><br>• **The requirement.** We want a v, not zero, with A v = λv. Move everything to one side and it becomes (A − λI) v = 0, where I is the identity matrix.<br><br>• **What that demands.** A − λI must have no inverse, so its determinant is 0. Remember the Determinant card: a determinant of 0 meant the square got squashed and nothing could undo it.<br><br>• **Write it out.** Expanding the determinant gives det(A − λI) = (a − λ)(d − λ) − bc = λ² − (a + d)λ + (ad − bc) = λ² − tr λ + det.<br><br>• **Solve.** Set it to 0 and use the quadratic formula: λ = (tr ± √(tr² − 4 det)) / 2. Then, for each λ, solve (A − λI) v = 0 for v. |

**What changed.** Starts as a story and asks the key question out loud before step 1: “Why do we want that matrix to have no inverse?”, answered in one sentence from facts on the card. Step 2 is shorter and links back to the Determinant card. The four steps keep their bold labels and logic. Still Derived. The Reveal question after the list is unchanged.

**CHECK.** The question and its one-sentence answer now carry the argument, and step 2 is trimmed to what only it adds: “A − λI must have no inverse, so its determinant is 0”, plus the Determinant link. The two sentences removed from step 2 (“A − λI has to send a non-zero arrow to zero”, “a matrix with an inverse only sends the zero vector to zero”) are both in the opening answer, word for word in meaning. The logical step “no inverse, so determinant 0” is unchanged from the original.

**CHECK.** The one-sentence answer is new text: an eigenvector is not zero; a matrix with an inverse only sends the zero vector to zero; so A − λI has to send a non-zero arrow to zero, which is only possible if it has no inverse. It is the same argument as the original step 2, moved earlier.

**CHECK.** “The key move is to look at the matrix A − λI” says in advance what step 1 derives. Step 1 still introduces it.

**CHECK.** Link back: “a determinant of 0 meant the square got squashed and nothing could undo it.” The Determinant card says a determinant of 0 means the area is 0 (squashed to a line or point), and that a non-zero determinant means nothing is lost so an inverse exists. “Nothing could undo it” is my paraphrase of the second, in the words you gave.


#### Stage 7 In an LLM

| Before | After |
|---|---|
| • **Nothing specific to claim.** Eigenvalues and eigenvectors are not a named step in how a transformer processes text, and this card makes no claim that they are. The real-life examples above are where this card’s idea is used.<br><br>**Simplified.** This card works with 2×2 matrices. Larger matrices have as many eigenvalues as they have rows, but finding them takes more than a quadratic formula. | • **An honest note.** Eigenvalues and eigenvectors are not a named step in how a transformer processes text, and we won’t pretend otherwise. The idea earns its place as a tool for understanding matrices, and some real uses are the ones in Real life above: vibration, spinning bodies and PageRank.<br><br>**Simplified.** Here we work only with 2×2 matrices. Larger matrices have as many eigenvalues as they have rows, but finding them takes more than a quadratic formula. |

**What changed.** Follows TONE-PASS section 6. The label “Nothing specific to claim” is now “An honest note”. “This card makes no claim” is now “we won’t pretend otherwise”. The Simplified caveat says “Here we work only with 2×2 matrices” (was “This card works with”).

**CHECK.** “The idea earns its place as a tool for understanding matrices” is new wording from TONE-PASS. The original said only that the real-life examples are where the idea is used. It is a modest statement, but it is a claim the original did not make. Keep, or cut back to the original?

**CHECK.** The label change removes the words “Nothing specific to claim”. The claim (no named step in a transformer; Conceptual) is kept, and CLAIMS.md line 188 still describes it correctly, so I did not edit CLAIMS.md.


#### Key takeaways

| Before | After |
|---|---|
| An eigenvector v of A satisfies Av = λv with v not zero: A only stretches it by the eigenvalue λ, so it stays on its own line. Any non-zero multiple of it is one too, so it is a direction, not a single arrow.<br><br>For a 2×2 matrix the eigenvalues are (tr ± √(tr² − 4 det))/2; the sum is the trace and the product is the determinant.<br><br>If the discriminant tr² − 4 det is negative there are no real eigenvalues, as for a rotation by an angle that is not a multiple of π.<br><br>A shear with rows (1, k) and (0, 1), k not 0, has eigenvalue 1 but only one eigenvector direction. | An eigenvector v of A is a non-zero arrow with Av = λv: A only stretches it, by the eigenvalue λ, so it stays on its own line. Any non-zero multiple of it works too, so an eigenvector is a direction, not one particular arrow.<br><br>For a 2×2 matrix the eigenvalues are (tr ± √(tr² − 4 det))/2. Add them and you get the trace; multiply them and you get the determinant.<br><br>When the discriminant tr² − 4 det is negative there are no real eigenvalues. A rotation by an angle that is not a multiple of π is an example.<br><br>A shear with rows (1, k) and (0, 1), where k is not 0, has eigenvalue 1 but only one eigenvector direction. |

**What changed.** Spoken to the reader. Takeaway 2 says “Add them and you get the trace; multiply them and you get the determinant”. No contractions added: the takeaways restate formal facts.


#### Teach it

| Before | After |
|---|---|
| **60-second explanation**<br><br>“A matrix usually tilts arrows. An eigenvector is an arrow it does not tilt: it only stretches or flips it, by a number called the eigenvalue. To find them, ask when A minus λ times the identity has no inverse, set its determinant to zero, and solve the quadratic. The two answers add to the trace and multiply to the determinant. If the discriminant is negative there are none; if the eigenvalue repeats there may be only one direction.”<br><br>**Everyday analogy**<br><br>A spinning merry-go-round seen from above: everything turns except the pole at the centre. *Where it breaks down:* an eigenvector is a direction kept, not a point at rest, and it can be stretched along the way.<br><br>**Whiteboard sequence**<br><br>• Draw v and Av from one point, tilted differently.<br><br>• Rotate v until Av lies along it.<br><br>• Write A v = λ v beside the two parallel arrows.<br><br>• Compute tr and det and the discriminant.<br><br>• Solve for λ, then find v for each λ.<br><br>**Questions learners ask**<br><br>**Can an eigenvalue be negative or zero?** Yes. Negative means the arrow is flipped as well as stretched; zero means it is squashed to nothing.<br><br>**Why must v not be zero?** Because A·0 = λ·0 for every λ, so it would make every number an eigenvalue and tell us nothing.<br><br>**Does every matrix have eigenvectors?** Not real ones: a rotation by an angle that is not a multiple of π has none, and a shear has too few.<br><br>**Common misconception**<br><br>“An eigenvector is one particular arrow.” It is a direction: every non-zero multiple of it is an eigenvector too. | **60-second explanation**<br><br>“A matrix usually tilts arrows. An eigenvector is an arrow it doesn’t tilt: it only stretches or flips it, by a number called the eigenvalue. To find them, ask when A minus λ times the identity has no inverse. That happens when its determinant is zero, so set the determinant to zero and solve the quadratic. The two answers add to the trace and multiply to the determinant. If the discriminant is negative there are none; if the eigenvalue repeats there may be only one direction.”<br><br>**Everyday analogy**<br><br>Picture a spinning merry-go-round seen from above. Everything turns except the pole at the centre. *Where it breaks down:* an eigenvector is a direction that’s kept, not a point at rest, and it can be stretched along the way.<br><br>**Whiteboard sequence**<br><br>• Draw v and Av from one point, tilted differently.<br><br>• Rotate v until Av lies along it.<br><br>• Write A v = λ v beside the two parallel arrows.<br><br>• Work out tr and det, then the discriminant.<br><br>• Solve for λ, then find v for each λ.<br><br>**Questions learners ask**<br><br>**Can an eigenvalue be negative or zero?** Yes. Negative means the arrow is flipped as well as stretched; zero means it’s squashed to nothing.<br><br>**Why must v not be zero?** Because A·0 = λ·0 for every λ, so it would make every number an eigenvalue and tell us nothing.<br><br>**Does every matrix have eigenvectors?** Not always. Over the real numbers, a rotation by an angle that is not a multiple of π has none, and a shear has too few.<br><br>**Common misconception**<br><br>“An eigenvector is one particular arrow.” It isn’t. It’s a direction: every non-zero multiple of it is an eigenvector too, so 2v and −3v count as well as v. |

**What changed.** The 60-second script splits one long sentence into two (“That happens when its determinant is zero, so…”). Analogy opens “Picture a…”, caveat kept. The whiteboard step reads “Work out tr and det, then the discriminant”. The misconception now says “It is not” and reminds the reader that 2v and −3v count too.

**CHECK.** Question 3: “Not real ones:” became “Not always. Over the real numbers,”. I believe these mean the same; “real ones” was ambiguous. Original wording kept for the other two questions.


#### Predict hint(s)

| Before | After |
|---|---|
| eig-a: Find the trace and the determinant, then use λ = (tr ± √(tr² − 4 det)) / 2.<br><br>eig-b: The trace is the sum of the diagonal; the determinant is ad − bc. | eig-a: You’ll need the trace and the determinant first, then put them into λ = (tr ± √(tr² − 4 det)) / 2.<br><br>eig-b: You’ll need the trace (add the two diagonal entries) and the determinant, ad − bc. |

**What changed.** Both hints now say what to do first. eig-b says “Add the two diagonal entries” (the card is 2×2, so the diagonal has two entries).


**Facts preserved.** Every number, every formula (A v = λv, λ = (tr ± √(tr² − 4 det))/2, (A − λI) v = 0, the determinant expansion, the table of cases), the PageRank citation (Page, Brin, Motwani and Winograd, 1999), the MML Ch 4.2 reference, the Derived tag, the Simplified caveat, the “Where it breaks down” caveat, the glossary terms (including defective matrix and discriminant), the five Teach-it headings, and the Spot it, Predict, Reveal and Explain questions with their answers are unchanged. Checked by tests/facts-preserved.test.mjs; the only exceptions are the stage 7 lead-in label (below).

