# CARD-BRIEFS.md: one entry per card

How to read an entry.
- **Heading:** every entry starts with exactly `**Title** (concept-id). Mode X.` The id is the card's id in data/course.json. `tools/check-course.mjs` parses this pattern, fails (with the line number) on any entry that does not match it, and compares the mode with the card's `voice` in course.json.
- **Mode:** A Foundation, AB Bridge, B Build (see VOICE.md section 12).
- **Basis:** "Study" means published learner research on that topic. "Judgement" means no study found; chosen by the mode rules. Judgement entries are to be corrected by the reader test.
- **Open with:** a suggestion for stage 1, not a script.
- **Name this trip-up:** only where research documents one. Blank means find it in the reader test; do not invent one.
- **Don't lean on:** things that make the card harder, per the research.

Evidence limits: studies are mostly university students, small samples. Several were read only as abstracts (Thomas and Stewart on eigenvectors, Zazkis on summation, the APS dot-product abstract). Moore on trigonometry and the Plaxco/Wawro eigenvector papers were not read at all.

## Module 0

**Variables** (m00-variables). Mode A. Basis: study (Küchemann's letter interpretations: letters first read as objects or specific numbers, general variable much later). Open with: the labelled box that can hold different things. Trip-up: a letter is not a fixed object or an abbreviation (not "a for apple"). Don't lean on: a general-variable definition up front.

**Equations** (m00-equations). Mode A. Basis: judgement. Open with: pouring 4 litres into two glasses (already in the pilot-quality text). Trip-up: (find in reader test). Don't lean on: solving procedures before the balance idea.

**Functions** (m00-functions). Mode AB. Basis: study (Carlson and Oehrtman: students treat a function as a calculation and miss how output changes as input changes). Open with: a machine you feed numbers, then drag the input and watch the output move. Trip-up: a function is a relationship you can watch change, not only a rule you evaluate. Don't lean on: formula-only presentations.

**Slope** (m00-slope). Mode A. Basis: study (slope is held as several separate conceptions: ratio, steepness, rate). Open with: a ramp or a road. Trip-up: steepness, rise over run and rate of change are the same thing seen three ways; show them together. Don't lean on: the formula alone.

**Exponents** (m00-exponents). Mode A. Basis: study (exponential growth bias: people underestimate exponential growth; framing as doubling times reduced the bias, short graph interventions did not reliably help). Open with: doubling (a rumour, folded paper). Trip-up: growth from repeated multiplying outruns what intuition predicts. Don't lean on: growth graphs as the first picture.

**Ratios** (m00-ratios). Mode A. Basis: judgement. Open with: a recipe scaled up or down. Trip-up: (find in reader test).

**Notation** (m00-notation). Mode A. Basis: judgement. Open with: shorthand you already use (tally marks, a recipe's abbreviations). Trip-up: (find in reader test).

**Logarithms** (m00-logarithms). Mode AB. Basis: study (Kastberg: students struggle to see a logarithm as an exponent; it worked when built from exponents). Open with: the Exponents card's doubling story, asked backwards ("how many doublings to reach 1,000?"). Trip-up: a log is an exponent, not a new kind of operation. Don't lean on: log-axis charts as the first picture (reading values off log axes was far less accurate than linear in one study: 42% vs 86%).

**Σ (sigma notation)** (m00-sigma). Mode AB. Basis: study, abstract only (Zazkis on summation notation). Open with: a receipt added line by line, then the same sum written compactly. Trip-up: (find in reader test). Don't lean on: the symbol before the receipt.

**Sine and cosine** (m00-trig). Mode AB. Basis: thin (Moore's work on trigonometry and angle measure was not read; this is mostly judgement). Open with: a point going round a circle, with its shadow on the floor and the wall. Trip-up: (find in reader test). Don't lean on: triangle-only (SOH CAH TOA) definitions as the only picture.

## Module 1

**Vectors** (m01-vectors). Mode A. Basis: judgement. Open with: a step on a map (direction and distance), then the same step as a list of two numbers. Trip-up: arrow and list are the same object seen two ways.

**Combining vectors** (m01-combine). Mode A. Basis: judgement. Open with: two walks, one after the other. Trip-up: (find in reader test).

**Matrices** (m01-matrices). Mode A. Basis: judgement. Open with: a table of numbers you already read (a spreadsheet, a timetable). Trip-up: (find in reader test).

**Matrix multiplication** (m01-matmul). Mode AB. Basis: thin (one small preliminary study on how students reason about matrix composition). Open with: two machines in a row, one feeding the next. Trip-up: (find in reader test). Don't lean on: the row-times-column rule before the idea of doing one transformation after another.

**Systems of equations** (m01-systems). Mode AB. Basis: judgement. Open with: the Equations card's two glasses, now with a second clue. Trip-up: (find in reader test).

**Span** (m01-span). Mode AB. Basis: study (Wawro et al.: students hold weak mental pictures of subspace; Dorier and Harel: formal definitions arrive as an obstacle unless concreteness and a felt need come first). Open with: "where can you get to using only these moves?" Trip-up: (find in reader test). Don't lean on: the formal definition before the reachable-places picture.

**Linear transformations** (m01-transformations). Mode AB. Basis: judgement (consistent with Harel's concreteness first, then generalising). Open with: a grid being stretched or turned. Trip-up: (find in reader test).

**Transpose, identity, inverse** (m01-transpose). Mode B. Basis: judgement. Open with: the question "how do I undo this?" and one line recalling Matrices and Linear transformations. Trip-up: (find in reader test).

## Module 2

**Norms** (m02-norms). Mode AB. Basis: judgement. Open with: how long is this arrow (Pythagoras you already know), then ask which "length" suits which job. Trip-up: (find in reader test).

**Dot product** (m02-dot-product). Mode AB. Basis: study, abstract only (APS abstract: on the dot product's magnitude, students scored 28 to 59%, depending on whether it was framed in maths or physics; consistency across tasks 15 to 58%; some computed correctly yet called the result a vector). Open with: the shadow of one arrow on another. Trip-up: you can compute it correctly and still mistake it for a vector; it is a single number. Show the component formula and the shadow/cosine formula side by side and say how they connect.

**Angle and cosine** (m02-angle-cosine). Mode AB. Basis: study, same abstract (the trigonometric definition was the most common strategy, but using it did not always match a correct answer). Open with: Dot product's shadow, now used to read off an angle. Trip-up: the cosine formula is a way to read the dot product, not a separate recipe. Don't lean on: the formula before the picture.

**Projections** (m02-projections). Mode AB. Basis: judgement. Open with: the shadow, again, and what is left over. Trip-up: (find in reader test).

**Distance** (m02-distance). Mode B. Basis: judgement. Open with: the question "how far apart are these two?" and one line recalling Norms and Combining vectors (distance is the norm of the difference). Trip-up: (find in reader test).

**Orthogonality** (m02-orthogonality). Mode B. Basis: judgement. Open with: the question "when does one arrow tell you nothing about another?" and a recall of Dot product (zero dot product). Trip-up: (find in reader test).

**Why divide by √d_k** (m02-sqrt-dk). Mode B. Basis: judgement. Open with: the small mystery in the original Transformer paper, and a recall of Dot product and Orthogonality. Trip-up: (find in reader test).

## Module 3

**Determinant** (m03-determinant). Mode AB. Basis: study (Wawro et al.: students reinvented the determinant from area scaling; formula-first is the documented failure). Open with: the area of the unit square after the grid is transformed. Trip-up: (find in reader test). Don't lean on: the formula before area scaling.

**Trace** (m03-trace). Mode B. Basis: judgement. Open with: the question "is there one number that sums up a matrix?" and a recall of Matrices. Trip-up: (find in reader test).

**Eigenvalues and eigenvectors** (m03-eigenvectors). Mode AB. Basis: partial (Thomas and Stewart, abstract only; the Plaxco/Wawro eigenvector papers not read). Open with: pushing on a rubber sheet (already in the pilot). Trip-up: (find in reader test). Don't lean on: the characteristic-equation procedure before the "stays on its line" picture.

**Eigendecomposition** (m03-eigendecomposition). Mode B. Basis: judgement. Open with: the question "can I describe a matrix purely by its stretching directions?" and a recall of Eigenvectors. Trip-up: (find in reader test).

**SVD** (m03-svd). Mode AB. Basis: judgement. Open with: pressing a round lump of dough (already in the text). Trip-up: (find in reader test).

**Low-rank approximation** (m03-low-rank). Mode B. Basis: judgement. Open with: the question "how much of a big table can I throw away and keep the picture?" and a recall of SVD. Trip-up: (find in reader test).

## Count
9 A, 15 AB, 7 B = 31 cards. A: Variables, Equations, Slope, Exponents, Ratios, Notation, Vectors, Combining vectors, Matrices. B: Transpose/identity/inverse, Distance, Orthogonality, √d_k, Trace, Eigendecomposition, Low-rank.

Pilot cards: Variables (A) and Eigenvalues and eigenvectors (AB) are already rewritten. Check them against their briefs before the reader test.
