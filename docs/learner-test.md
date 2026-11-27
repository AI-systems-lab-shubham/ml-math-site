# Learner reading sheet: which version teaches better?

Two cards from a maths course for machine learning, each in two versions. You don't need to know anything beyond high-school maths. Read each pair, then answer the four questions under it. The versions are labelled only A and B, and which is which is not given until the very end (please don't look first).

Answer in a few words; you can skip a pair. For each pair:

- (a) Which would you rather learn from, and why?
- (b) Which sentences felt stiff or too chatty?
- (c) In your own words, explain the idea back in two sentences.
- (d) Where did you get stuck?

Text only: the interactive pictures and the quiz questions are left out, so ignore any mention of "the picture below". Some text points back to earlier cards you haven't read (for example "the Determinant card"); just read past it.

---

## Card: Variables and expressions

### Pair 1: Stage 1: Meaning (Variables and expressions)

#### Version A

Think of an empty box with a label stuck on the front, like a moving box marked “kitchen”. The label is a name, and the box is waiting for something to go in it. (A real moving box holds many things; this box holds one number at a time.) A variable works the same way: it is a name for a number we have not picked yet. Put 4 in the box and every place the label appears means 4. Put 10 in and it means 10.

Let’s put the box to work. An expression is a recipe that uses the box. Ours says “three copies of the box, plus 2”, and we write it 3x+2. Read it aloud as “three x plus two”.

Here’s where people trip: when a number sits next to a letter, the multiplication sign is hidden. So 3x isn’t one new symbol. It means 3×x.

#### Version B

Imagine a box with a label on it and nothing inside yet. That is a variable: a name for a number we have not picked. Put 4 in the box and every place the label appears means 4. Put 10 in and it means 10.

An expression is a recipe that uses the box. Our example is “three copies of the box, plus 2”. We write it 3x+2. When a number sits next to a letter, the multiplication sign is hidden: 3x means 3×x.

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 2: Stage 5: Why and when (Variables and expressions)

#### Version A

Why bother with a letter at all? Without variables you’d need a separate sentence for every case: “3 times 4, plus 2”, “3 times 5, plus 2”, and so on. One letter lets a single statement cover every case at once.

Reach for a variable whenever a rule should hold for many numbers. If you only ever need one specific number, write the number itself.

#### Version B

Without variables you would write a separate sentence for every case: “3 times 4, plus 2”, “3 times 5, plus 2”, and so on. A variable lets one statement cover every case at once.

Use one whenever a rule should hold for many numbers. If you only ever need one specific number, just write the number.

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 3: Stage 6: How to arrive at it (Variables and expressions)

#### Version A

◆ Convention

Any mark could stand for the box: a square, a star, the letter k. We could have chosen differently, and the maths would not change. The habit is to use letters from the end of the alphabet (x, y, z) for quantities that vary and letters from the start (a, b, c) for fixed numbers we have not specified.

#### Version B

◆ Convention

Suppose you had to choose a mark for the box yourself. A square would work, and so would a star, or the letter k. We could have chosen differently, and the maths wouldn’t change.

In practice the habit is to use letters from the end of the alphabet (x, y, z) for quantities that vary and letters from the start (a, b, c) for fixed numbers we have not specified.

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 4: Stage 7: In an LLM (Variables and expressions)

#### Version A

In a language model, every number the model learns is one of these empty boxes. It is called a parameter, and it stays a variable until training fixes its value. The model as a whole is a very large expression made of those variables. GPT-3 (2020) has 175 billion of them (Brown et al., 2020).

Simplified. A real model's expression is enormously bigger than 3x + 2, but it is built from the same pieces: numbers, variables, multiplication and addition (plus a few other operations).

#### Version B

Every number a language model learns is a variable, called a parameter, until training fixes its value. The model is a very large expression made of those variables. GPT-3 (2020) has 175 billion of them (Brown et al., 2020).

Simplified. A real model's expression is enormously bigger than 3x + 2, but it is built from the same pieces: numbers, variables, multiplication and addition (plus a few other operations).

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 5: Teach it (Variables and expressions)

#### Version A

**Everyday analogy**

Think of a form with blanks, like “Dear ____”. The blank stands for whatever name you fill in. Where it breaks down: a blank on a form is filled once, but a letter in maths can be filled with different numbers so you can see what happens, and within one problem the same letter means the same number everywhere.

**Common misconception**

“x always means the same number.” It doesn’t. x is a placeholder, and its value is whatever the problem says or whatever you choose for the moment.

Your progress on this card

Not started

In progress

Complete

Revisit

#### Version B

**Everyday analogy**

A form with blanks: “Dear ____”. The blank stands for whatever name you fill in. Where it breaks down: a blank on a form is filled once, but a letter in maths can be filled with different numbers to see what happens, and the same letter means the same number everywhere in one problem.

**Common misconception**

“x always means the same number.” It does not. x is a placeholder; its value is whatever the problem says or whatever we choose for the moment.

Your progress on this card

Not started

In progress

Complete

Revisit

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

---

## Card: Eigenvalues and eigenvectors

### Pair 6: Stage 1: Meaning (Eigenvalues and eigenvectors)

#### Version A

Push on a sheet of rubber so that it stretches and slants. Most lines drawn on it tilt to new directions. But some line may stay exactly where it was, as a line: points slide along it and never leave. An arrow lying along that line comes out pointing along the same line, longer, shorter or reversed. Such an arrow is an eigenvector of the matrix, and the factor by which it is stretched is its eigenvalue.

In symbols, A v = λv: applying the matrix A to v gives the same arrow multiplied by the number λ (the Greek letter lambda). We insist that v is not the zero vector, because the zero vector fits for every λ and tells us nothing. And only the direction matters: if v works then so does 2v, or −3v. Only a square matrix can have eigenvectors, because the output must live in the same space as the input.

A v = λ v,  v ≠ 0

#### Version B

Picture a sheet of rubber with a grid drawn on it. Push on it so that it stretches and slants. Most of the lines you drew tilt to new directions. But some line may stay exactly where it was, as a line: points slide along it and never leave it. An arrow lying along that line comes out pointing along the same line, longer, shorter or reversed. Such an arrow is an eigenvector of the matrix, and the factor by which it is stretched is its eigenvalue. The picture below lets you try this on a matrix yourself.

Now let’s put symbols on it. We write A v = λv and read it aloud as “A times v equals lambda times v”. In words: applying the matrix A to v gives the same arrow multiplied by the number λ (the Greek letter lambda). Three details go with it. First, v must not be the zero vector, because the zero vector fits for every λ and tells us nothing. Second, only the direction matters: if v works then so does 2v, or −3v. Third, only a square matrix can have eigenvectors, because the output must live in the same space as the input.

A v = λ v,  v ≠ 0

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 7: Stage 5: Why and when (Eigenvalues and eigenvectors)

#### Version A

Eigenvectors turn a complicated transformation into one-dimensional pieces: along each eigenvector the matrix is just a number. For a 2×2 matrix the eigenvalues come from the trace and determinant: λ = (tr ± √(tr² − 4 det)) / 2, so their sum is the trace and their product is the determinant (7 and 10 for the worked example).

When it does not fit. The discriminant tr² − 4 det decides which case you are in. Every number in this table comes from tested code:

| Matrix | tr² − 4 det | Real eigenvalues | Eigenvector directions

| Rows (4, 1) and (2, 3) | 9 | two: 5 and 2 | two

| Scaling by 2 and 3 | 1 | two: 3 and 2 | two (the axes)

| Projection onto the x-axis | 1 | two: 1 and 0 | two (one is squashed to 0)

| Rotation by 60° | −3 | none | none: every arrow is turned

| Shear, k = 1 | 0 | one, repeated: 1 | only one: defective

A rotation by an angle that is not a multiple of π has no real eigenvalues, because its tr² − 4 det is negative (here tr = 1 and det = 1), and no real arrow keeps its line. The shear with k not 0 has its eigenvalue 1 repeated, and only the arrows along the x-axis stay on their line, so it has too few eigenvectors to span the plane.

#### Version B

You reach for eigenvectors when a transformation looks complicated and you want to break it into simple pieces. They turn it into one-dimensional pieces: along each eigenvector the matrix acts as a single number. For a 2×2 matrix the eigenvalues come from the trace and determinant: λ = (tr ± √(tr² − 4 det)) / 2, so their sum is the trace and their product is the determinant (7 and 10 for the worked example).

When it does not fit. Here are some 2×2 cases side by side in one table. The discriminant tr² − 4 det tells you which row you are in.

| Matrix | tr² − 4 det | Real eigenvalues | Eigenvector directions

| Rows (4, 1) and (2, 3) | 9 | two: 5 and 2 | two

| Scaling by 2 and 3 | 1 | two: 3 and 2 | two (the axes)

| Projection onto the x-axis | 1 | two: 1 and 0 | two (one is squashed to 0)

| Rotation by 60° | −3 | none | none: every arrow is turned

| Shear, k = 1 | 0 | one, repeated: 1 | only one: defective

Let’s look closer at two rows. A rotation by an angle that is not a multiple of π has no real eigenvalues, because its tr² − 4 det is negative (here tr = 1 and det = 1), and no real arrow keeps its line. The shear with k not 0 has its eigenvalue 1 repeated, and only the arrows along the x-axis stay on their line, so it has too few eigenvectors to span the plane.

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 8: Stage 6: How to arrive at it (Eigenvalues and eigenvectors)

#### Version A

✓ Derived

Suppose you had to find these special arrows yourself, starting from nothing but the rule A v = λv. The key move is to look at the matrix A − λI, where I is the identity matrix. Why do we want that matrix to have no inverse? Because an eigenvector is not zero, and a matrix with an inverse only sends the zero vector to zero, so A − λI has to send a non-zero arrow to zero, and that is only possible if it has no inverse. We’ll take it in four steps.

- The requirement. We want a v, not zero, with A v = λv. Move everything to one side and it becomes (A − λI) v = 0, where I is the identity matrix.

- What that demands. A − λI must have no inverse, so its determinant is 0. Remember the Determinant card: a determinant of 0 meant the square got squashed and nothing could undo it.

- Write it out. Expanding the determinant gives det(A − λI) = (a − λ)(d − λ) − bc = λ² − (a + d)λ + (ad − bc) = λ² − tr λ + det.

- Solve. Set it to 0 and use the quadratic formula: λ = (tr ± √(tr² − 4 det)) / 2. Then, for each λ, solve (A − λI) v = 0 for v.


#### Version B

✓ Derived

- The requirement. Find v, not zero, with A v = λv. Move everything to one side: (A − λI) v = 0, where I is the identity matrix.

- What that demands. The matrix A − λI sends a non-zero arrow to zero. A matrix with an inverse only sends the zero vector to zero, so A − λI must have no inverse: its determinant is 0.

- Write it out. det(A − λI) = (a − λ)(d − λ) − bc = λ² − (a + d)λ + (ad − bc) = λ² − tr λ + det.

- Solve. Set it to 0 and use the quadratic formula: λ = (tr ± √(tr² − 4 det)) / 2. For each λ, solve (A − λI) v = 0 for v.


**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 9: Stage 7: In an LLM (Eigenvalues and eigenvectors)

#### Version A

- An honest note. Eigenvalues and eigenvectors are not a named step in how a transformer processes text, and we won’t pretend otherwise. The idea earns its place as a tool for understanding matrices, and some real uses are the ones in Real life above: vibration, spinning bodies and PageRank.

Simplified. Here we work only with 2×2 matrices. Larger matrices have as many eigenvalues as they have rows, but finding them takes more than a quadratic formula.

#### Version B

- Nothing specific to claim. Eigenvalues and eigenvectors are not a named step in how a transformer processes text, and this card makes no claim that they are. The real-life examples above are where this card’s idea is used.

Simplified. This card works with 2×2 matrices. Larger matrices have as many eigenvalues as they have rows, but finding them takes more than a quadratic formula.

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?

### Pair 10: Teach it (Eigenvalues and eigenvectors)

#### Version A

**60-second explanation**

“A matrix usually tilts arrows. An eigenvector is an arrow it doesn’t tilt: it only stretches or flips it, by a number called the eigenvalue. To find them, ask when A minus λ times the identity has no inverse. That happens when its determinant is zero, so set the determinant to zero and solve the quadratic. The two answers add to the trace and multiply to the determinant. If the discriminant is negative there are none; if the eigenvalue repeats there may be only one direction.”

**Everyday analogy**

Picture a spinning merry-go-round seen from above. Everything turns except the pole at the centre. Where it breaks down: an eigenvector is a direction that’s kept, not a point at rest, and it can be stretched along the way.

**Whiteboard sequence**

- Draw v and Av from one point, tilted differently.

- Rotate v until Av lies along it.

- Write A v = λ v beside the two parallel arrows.

- Work out tr and det, then the discriminant.

- Solve for λ, then find v for each λ.

**Questions learners ask**

Can an eigenvalue be negative or zero? Yes. Negative means the arrow is flipped as well as stretched; zero means it’s squashed to nothing.

Why must v not be zero? Because A·0 = λ·0 for every λ, so it would make every number an eigenvalue and tell us nothing.

Does every matrix have eigenvectors? Not always. Over the real numbers, a rotation by an angle that is not a multiple of π has none, and a shear has too few.

**Common misconception**

“An eigenvector is one particular arrow.” It isn’t. It’s a direction: every non-zero multiple of it is an eigenvector too, so 2v and −3v count as well as v.

Your progress on this card

Not started

In progress

Complete

Revisit

#### Version B

**60-second explanation**

“A matrix usually tilts arrows. An eigenvector is an arrow it does not tilt: it only stretches or flips it, by a number called the eigenvalue. To find them, ask when A minus λ times the identity has no inverse, set its determinant to zero, and solve the quadratic. The two answers add to the trace and multiply to the determinant. If the discriminant is negative there are none; if the eigenvalue repeats there may be only one direction.”

**Everyday analogy**

A spinning merry-go-round seen from above: everything turns except the pole at the centre. Where it breaks down: an eigenvector is a direction kept, not a point at rest, and it can be stretched along the way.

**Whiteboard sequence**

- Draw v and Av from one point, tilted differently.

- Rotate v until Av lies along it.

- Write A v = λ v beside the two parallel arrows.

- Compute tr and det and the discriminant.

- Solve for λ, then find v for each λ.

**Questions learners ask**

Can an eigenvalue be negative or zero? Yes. Negative means the arrow is flipped as well as stretched; zero means it is squashed to nothing.

Why must v not be zero? Because A·0 = λ·0 for every λ, so it would make every number an eigenvalue and tell us nothing.

Does every matrix have eigenvectors? Not real ones: a rotation by an angle that is not a multiple of π has none, and a shear has too few.

**Common misconception**

“An eigenvector is one particular arrow.” It is a direction: every non-zero multiple of it is an eigenvector too.

Your progress on this card

Not started

In progress

Complete

Revisit

**Your answers**

(a) Which would you rather learn from, and why?

(b) Which sentences felt stiff or too chatty?

(c) In your own words, explain the idea back in two sentences.

(d) Where did you get stuck?





---
---

# ANSWER KEY (facilitator only: do not show the reader)

Version A is the original text; Version B is the rewrite, or the reverse, as listed.

| Pair | Card | Part | Original is | Rewrite is |
|---|---|---|---|---|
| 1 | Variables and expressions | Stage 1: Meaning | Version B | Version A |
| 2 | Variables and expressions | Stage 5: Why and when | Version B | Version A |
| 3 | Variables and expressions | Stage 6: How to arrive at it | Version A | Version B |
| 4 | Variables and expressions | Stage 7: In an LLM | Version B | Version A |
| 5 | Variables and expressions | Teach it | Version B | Version A |
| 6 | Eigenvalues and eigenvectors | Stage 1: Meaning | Version A | Version B |
| 7 | Eigenvalues and eigenvectors | Stage 5: Why and when | Version A | Version B |
| 8 | Eigenvalues and eigenvectors | Stage 6: How to arrive at it | Version B | Version A |
| 9 | Eigenvalues and eigenvectors | Stage 7: In an LLM | Version B | Version A |
| 10 | Eigenvalues and eigenvectors | Teach it | Version B | Version A |

Original = text on `main` at commit `4b98d5d`. Rewrite = branch `voice-pilot`. Order was drawn with a fixed random seed (20261126).
