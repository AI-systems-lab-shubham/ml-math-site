# Claims register

One line per factual or numeric claim made on the site. **Test** means the number is computed by code in `assets/js/foundations-math.mjs` (Module 0) or `assets/js/linalg-math.mjs` (Module 1) and covered by `tests/foundations-math.test.mjs` or `tests/linalg-math.test.mjs`. **Source** means a publicly documented external fact. **Verify** marks a source I have cited from memory and could not re-check offline; confirm it before the site is published.

Format: `page · claim · basis`

## Module 0, part 1 (variables to exponents)
- Variables · GPT-3 (2020) has 175 billion parameters · Source: Brown et al., 2020, "Language Models are Few-Shot Learners". Verify.
- Equations · GPT-3 (2020) had a 2,048-token context window · Source: Brown et al., 2020. Verify.
- Equations · 2,048 − 1,500 = 548 tokens remain · Test: `remainingTokens`.
- Equations · 1 − (0.5 + 0.25 + 0.125) = 0.125 · Test: `total`.
- Equations · next-token probabilities over the vocabulary sum to 1 · Source: definition of a probability distribution; softmax output (Module 5).
- Equations · a neuron's w₁x₁ + w₂x₂ + b = 0 is a line · Maths: standard line equation `ax + by = c`, tested by `lineEndpoints`.
- Functions · a language model maps a token sequence to next-token probabilities; sampling happens outside that function · Source: standard description of autoregressive language models (e.g. Brown et al., 2020).
- Slope · a neuron computes a weighted sum plus a bias; transformer layers are built from such weighted sums · Source: Vaswani et al., 2017 (linear layers and feed-forward networks).
- Exponents · 37,000² = 1,369,000,000 sequences of two tokens · Test: `exponentialValue`.
- Exponents · the original Transformer's English–German experiment used a shared vocabulary of about 37,000 tokens (byte-pair encoding); English–French used a 32,000 word-piece vocabulary · Source: Vaswani et al., 2017, §5.1. Verify.
- Exponents · 2¹⁰ = 1024, 1 + 10 = 11, doublings to reach 1000 is 10 · Test: `growthSequence`, `additionSequence`, `stepsToReach`.

## Logarithms
- Logs · log₂ 8 = 3, log₁₀ 1000 = 3, log₂ 32 = 5, log₁₀ 50 ≈ 1.70 · Test: `logSteps`.
- Logs · log(ab) = log a + log b, shown for 100 × 1000 · Test: "log of a product is the sum of logs".
- Earthquake · one magnitude step ≈ 10× amplitude · Convention of the Richter-style definition (log₁₀ of measured amplitude). Test: `magnitudeAmplitudeRatio`. Verify wording against USGS.
- Earthquake · one magnitude step is roughly 30× energy: about 32× (10^1.5 ≈ 31.6) under the classic 1.5 relation, and USGS also gives a newer estimate near 27× · Source: USGS magnitude/energy explanations; the 27× figure is quoted as supplied and not re-checked. The 32× is Test: `magnitudeEnergyRatio`. Verify.
- Earthquake · two steps is about 1,000× energy (classic relation only; about 730× at 27× per step) · Test: `magnitudeEnergyRatio(2)`; the 27× arithmetic is not on the page.
- Earthquake · "amplitude and energy per step differ because they are different quantities" · Same sources; no mechanism is claimed beyond the stated relations.
- Decibels · +10 dB = 10× power; +20 dB = 10× amplitude (pressure or voltage) = 100× power · Test: `powerRatioFromDecibels`, `amplitudeRatioFromDecibels`, `decibelsFromAmplitudeRatio`.
- Decibels · doubling power ≈ 3.01 dB · Test: `decibelsFromPowerRatio`.
- Decibels · power ∝ amplitude² · Source: standard physics for sound intensity and electrical power. The test "doubling amplitude quadruples power" checks the two dB formulas agree.
- Decibels · the range from the quietest to the loudest comfortably heard sounds is about 120–130 dB SPL, relative to 20 µPa · Source: commonly quoted approximate range; SPL reference pressure 20 µPa is the standard in air. At 120 dB the power (intensity) ratio is 10¹², Test: `powerRatioFromDecibels(120)`. Approximate; Verify.
- pH · pH = −log₁₀[H⁺]; each step is roughly 10× the effective concentration (strictly, activity) of hydrogen ions; pH 7 for 10⁻⁷ mol/L · Test: `pH` (arithmetic only). Neutral water near pH 7 at room temperature: standard chemistry.
- Octaves · an octave doubles frequency; 110 Hz to 880 Hz is 3 octaves · Test: `octavesBetween`.
- Bits · picking one of 8 equally likely options takes 3 yes/no questions · Test: `bitsToChoose`.
- Perception · "perception is logarithmic" is only approximate; power laws fit some senses better · Source: Weber–Fechner vs Stevens' power law (S. S. Stevens, 1957, Psychological Review). Stated as a caution, no numbers. Verify.
- LLM · product of 400 probabilities of 0.01 underflows to 0 in double precision, while the sum of natural logs is −1842.1 · Test: "summing logs avoids underflow". 10⁻⁸⁰⁰ is below the smallest double (about 5 × 10⁻³²⁴), which is a property of IEEE 754 double precision.
- LLM · sequence probability is the product of per-token probabilities · Source: chain rule of probability (Module 5), standard for autoregressive models.
- LLM · uniform over 4 tokens: ln 4 = 1.386 nats = 2 bits, perplexity 4 · Test: `perplexityFromNats`, `natsToBits`.
- LLM · perplexity = exp(average negative log-probability in nats), equivalently 2^(bits) · Source: standard definition. Test as above.

## Σ notation
- Sigma · Σ i² for i = 1..4 is 30; Σ(2i − 1) for i = 1..5 is 25; 1 + … + 100 = 5050 · Test: `sigma`, "sigma sums terms".
- Sigma · Σ i = n(n+1)/2 · Test: checked for n = 1, 5, 10, 100.
- Sigma · empty sum is 0 · Test: `sigma(3, 2, …)`.
- LLM · dot product of w = (2, −1, 3) and x = (4, 5, 1) is 6 · Test: `dotProduct`.
- LLM · a neuron computes a weighted sum; attention scores are dot products of queries and keys · Source: Vaswani et al., 2017 (scaled dot-product attention). The detail is Module 2.
- LLM · total surprise of probabilities ½, ¼, ⅛ is 1 + 2 + 3 = 6 bits, 2 bits per token · Test: `totalSurpriseBits`.
- LLM · next-token training loss is the average per-token surprise (cross-entropy); usually in nats · Source: standard (e.g. Brown et al., 2020 train with cross-entropy loss). Verify the citation if one is added later.

## Ratios, percentages, averages
- 15 of 60 is 25% · Test: `percentOf`.
- 80 → 100 is +25%; 100 → 80 is −20%; 2% → 3% is +1 point, +50% · Test: `percentChange`.
- mean of 3, 4, 5, 6, 60 is 15.6, median 5; mean of 2, 4, 9 is 5 · Test: `mean`, `median`.
- LLM · loss is a mean over tokens; benchmark scores are percentages · Conceptual; stated as such on the page.

## Sine and cosine
- cos 60° = 0.5, sin 60° ≈ 0.866, cos 180° = −1 · Test: `cosSinDegrees`.
- 50 N at 60°: 25 N forward, 43.3 N lifting · Test: `forceComponents`.
- sin² + cos² = 1 · Test: "cosine and sine of common angles".
- Pendulum position is approximately sinusoidal for small swings · Source: standard small-angle approximation in physics.
- Pure tone pressure follows a sine over time · Source: standard acoustics.
- LLM · cosine similarity is the cosine of the angle between two vectors · Definition (Module 2).
- LLM · original Transformer used fixed sinusoidal positional encodings; for position 1, the first pair (i = 0) is the highest-frequency pair (wavelength 2π), with wavelengths growing geometrically to 10000·2π; (sin 1, cos 1) = (0.841, 0.540) · Source: Vaswani et al., 2017, §3.5. Test: `positionEncodingPair`.
- LLM · the paper also tried learned position vectors with nearly identical results · Source: Vaswani et al., 2017, §3.5 and Table 3. Verify.
- LLM · the base model has d_model = 512 · Source: Vaswani et al., 2017, Table 3. Verify.
- LLM · many later models use other position schemes · Source: general public knowledge (e.g. learned positions in GPT-style models); stated loosely without naming a model.

## Notation
- x = (4, 7, 1, 9, 5): x₃ = 1, x₄ = 9; ŷ₃ = 2·1 + 1 = 3 · Test: `entryAt`, `affine`.
- Conventions for ŷ, bold vectors, ∈, ∀ · Convention; "books differ" is stated on the page.
- LLM · papers use this notation · Conceptual link, stated as such.
- LLM · positional-encoding wavelengths run geometrically from 2π (first pair) up to 10000·2π · Test: "position encoding: pair 0 is the fastest".

## Module 1, part 1 (linear algebra: vectors to matrix multiplication)
- Vectors · (3, 2, 7) has dimension 3 and v₃ = 7; entries count from 1 · Test: `dimension`, `entryOf`.
- Vectors · "walk 3 east, 2 north" as the list (3, 2); the drone example (30, 40) · Illustrative scenario; no model claim.
- Vectors · more than three entries cannot be drawn; addition, scaling and dot products work entry by entry in any dimension · Maths: definitions; `add` is tested for 2 and 3 entries, `scale` and `matVec` for 2 and 3, and `dotProduct` in Module 0. Stated in the page hero and the vectors card.
- Vectors · an embedding is a vector, and the original Transformer base model uses 512 entries (d_model) · Source: Vaswani et al., 2017, §3.4 (learned embeddings of dimension d_model) and Table 3. Test: `transformerBase`. Verify.
- Vectors · "cat" as (0.2, −1.1, 0.7, 0.4) · **Made-up illustration numbers, not model weights**; labelled as such on the page. Test: `illustrativeEmbedding` (shape only).
- Vectors · learned embedding entries have no readable meaning on their own · Conceptual caution, stated as Simplified on the page.
- Adding and scaling · 2a − b = (5, 0) for a = (2, 1), b = (−1, 2); tip-to-tail path (0, 0) → (4, 2) → (5, 0) · Test: `linearCombination`, `tipToTailPath`. The widget's largest reachable results stay inside the drawing (tested).
- Adding and scaling · doing the same walk twice is (6, 4) = scaling (3, 2) by 2 · Test: "scale multiplies every entry" and the distributive test (the page quotes the arithmetic only).
- Adding and scaling · two arrows at an angle give a total shorter than the sum of their lengths · Maths: triangle inequality, stated without numbers. Module 2 develops lengths.
- Adding and scaling · the original Transformer adds a position vector to each token's embedding because both have dimension d_model · Source: Vaswani et al., 2017, §3.5. Verify.
- Adding and scaling · each sub-layer's output is added to its input, then layer-normalised: LayerNorm(x + Sublayer(x)) · Source: Vaswani et al., 2017, §3.1. Verify.
- Adding and scaling · illustration: (0.2, −1.1, 0.7, 0.4) + (0.1, 0.3, −0.2, 0) = (0.3, −0.8, 0.5, 0.4) · **Made-up illustration numbers**; the sum is computed by `add`.
- Matrices · M = [[2, 1], [0, 3]], v = (3, 2): Mv = (8, 6) by rows (8, 6) and by columns 3·(2, 0) + 2·(1, 3) · Test: `matVec`, `matVecByColumns`, "worked example matrices".
- Matrices · a 3×2 matrix [[1,0],[0,1],[1,1]] takes (3, 2) to (3, 2, 5) · Test: "matVec changes the number of entries".
- Matrices · the columns of M are the images of (1, 0) and (0, 1); the widget default M = [[2, −1], [1, 1]] sends (1, 2) to (0, 3) · Test: "the columns of M are where the unit vectors go", "the matrix widget's default".
- Matrices · a matrix machine obeys M(cv) = c·Mv and M(a + b) = Ma + Mb, so it cannot square or take a maximum · Test: "a matrix machine is linear". The "cannot square or maximum" line is a direct consequence, no numbers.
- Matrices · the bakery table (flour and sugar per loaf and cake) · Illustrative scenario with no numbers on the page.
- Matrices · each attention head's query, key and value projections map a 512-entry vector to a 64-entry one: 64×512 in the column convention, 32,768 entries · Source: Vaswani et al., 2017, §3.2.2 (d_k = d_v = d_model/h = 64 with h = 8) and Table 3. Test: `entryCount`, `transformerBase`. Verify.
- Matrices · the Transformer paper writes the same projection as 512×64 because it multiplies row vectors (xW); this course uses column vectors (Wx), so it appears as 64×512 · Source: Vaswani et al., 2017, §3.2.1 (projection matrices W^Q ∈ ℝ^(d_model×d_k) applied to rows). Shape is displayed from `transformerBase`. Verify.
- Matrices · the feed-forward layer widens 512 to 2048 and back; each matrix has 1,048,576 entries · Source: Vaswani et al., 2017, §3.3 (d_ff = 2048). Test: `entryCount`. Verify.
- Matrices · the paper writes row vectors times matrices (x W), so its matrices are the transposes of the column-convention ones here; the entry counts are equal · Source: Vaswani et al., 2017, §3.2.2 and §3.3 formulas. Verify.
- Matrix multiplication · AB entries: [[1,2,3],[4,5,6]] times [[7,8],[9,10],[11,12]] is [[58,64],[139,154]]; entry (1, 2): 8 + 20 + 36 = 64; entry (2, 1): 28 + 45 + 66 = 139 · Test: `matMul`, `entryStep`.
- Matrix multiplication · (m×n)(n×p) = m×p, with m·n·p multiplications; 12 for the 2×3 times 3×2 example · Test: `canMultiply`, `resultShape`, `multiplyCount`.
- Matrix multiplication · swap matrix: PS swaps columns, SP swaps rows, and PS ≠ SP · Test: "AB is not BA".
- Matrix multiplication · (AB)v = A(Bv) is what forces the row-by-column rule; entry-by-entry multiplication fails it (P·Q example gives (2, 4) vs (0, 3)) · Test: "applying B then A equals applying AB", "entrywise product … does not compose machines".
- Matrix multiplication · the one-row matrix [1 1] times (1, 3) is 4, so (1, 3) solves x + y = 4 · Test: "the 1×2 matrix [1 1] times (x, y) is x + y". Links back to Module 0, Equations (`#concept-equations`).
- Matrix multiplication · cost-by-shop example: with A (3×2, kg per dish) and B (2×3, price per kg), B·A is 2×2 and A·B is 3×3 · Test: "three-way pricing example" (shapes only on the page).
- Matrix multiplication · a 2048×512 matrix times one 512-entry vector takes 1,048,576 multiplications · Test: `multiplyCountFromShapes`.
- LLM · much of a transformer's computation is matrix multiplication (projections, feed-forward layers, attention scores); no percentage is claimed because it depends on model and sequence size · Source: Vaswani et al., 2017 §3.2–3.3 describe these operations; the "much of" is a general statement, not measured here. Verify.
- LLM · GPUs suit matrix products because they do many independent multiplications and additions at once · General public knowledge, not tied to any company's systems. Verify if a citation is added.
- LLM · "attention" is a calculation of dot products and weighted sums, not attention in the human sense · Glossary `looseUse`; Vaswani et al., 2017, §3.2.1.
- LLM · real systems process many tokens at once, so the right-hand matrix has many columns · General description of batched computation; stated as a simplification.


## Module 1 objectives, takeaways and signposts (Session B2)
Added to `data/course.json` when Module 1 moved onto the lesson template. These restate what the cards already say; no number is new.
- Vectors · objectives and takeaways: a vector is an ordered list; (3, 2) and (2, 3) are different trips; the third entry of (3, 2, 7) is 7; adding, scaling and dot products work for any number of entries and only the arrow picture runs out · Basis: the card's Meaning, Worked example and Why-and-when stages; the vector (3, 2, 7) is the one tested in `tests/linalg-math.test.mjs`.
- Vectors · "a language model stores each token as an embedding, which is a vector" · Source: Vaswani et al., 2017, §3.4 (as on the card). Same claim as the card's In an LLM stage.
- Adding and scaling · addition is tip to tail and entry by entry; scaling multiplies every entry by the same scalar and a negative one reverses the arrow; 2a − b is a linear combination; adding (and so a linear combination) needs the same number of entries, scaling one vector does not · Basis: the card's Meaning and Why-and-when stages; the takeaways state the rules only and add no new numbers (the card's own numbers are covered by `linearCombination`, `add`, `scale` tests).
- Matrices · a matrix is a table and also a machine; each column says what one unit of an input contributes; the columns are where the unit arrows land; a matrix machine cannot square a number or take a maximum · Basis: the card's Meaning, Picture and Why-and-when stages (the "only weighted totals" limit is the linearity rule, tested by the matrix-vector tests).
- Matrix multiplication · each product entry is a row of the left matrix paired with a column of the right (a dot product); AB means do B first, then A (with vectors written as columns, as in most machine-learning texts; the page states this once, in the Meaning stage, and the "Simplified" callout in the Matrices card covers the paper's row-vector convention separately); (m×n)(n×p) = m×p; AB and BA are usually different · Test: `matMul`, `canMultiply`, `resultShape`, "AB is not BA", "applying B then A equals applying AB" (same tests as the claims above).
- Signposts · "Builds on" links added: Vectors on Module 0 Notation; Adding and scaling on Vectors; Matrices on Adding and scaling; Matrix multiplication on Matrices and Module 0 Σ notation (the card already uses the dot product from the Σ card) · Basis: the cross-references in the card text; they are suggestions, never locks.

## Module 1, part 2 (transpose to linear transformations)
Exact arithmetic: `rank`, `solveSystem`, `inverse`, `determinant` use exact fractions on integer matrices and throw on a non-integer entry, so no tolerance is involved. The only tolerances: `rank2` (|ad − bc| ≤ 1e-12 counts as zero) and the rotation tests (cos and sin compared within 1e-12); `rotationDegrees` returns exact entries (0, ±1) for multiples of 90°, and the widget rounds displayed entries to 3 decimals. No "In an LLM" line on these cards is only conceptual: the ones that were (inverses in a forward pass, solving a system inside a model) were dropped.
- Transpose and inverse · (AB)ᵀ = BᵀAᵀ and not AᵀBᵀ: A = [[1,2],[0,1]], B = [[1,0],[3,1]], AB = [[7,2],[3,1]], BA = [[1,2],[3,7]] (so AB ≠ BA), (AB)ᵀ = [[7,3],[2,1]] = BᵀAᵀ, AᵀBᵀ = [[1,3],[2,7]] · Test: "(AB)ᵀ = BᵀAᵀ: the order reverses, and AᵀBᵀ is the wrong rule"; shapes in "also holds for non-square shapes".
- Transpose and inverse · (AB)⁻¹ = B⁻¹A⁻¹ and not A⁻¹B⁻¹ for the same A, B (det AB = 7·1 − 2·3 = 1): (AB)⁻¹ = [[1,−2],[−3,7]] = B⁻¹A⁻¹, A⁻¹B⁻¹ = [[7,−2],[−3,1]] · Test: "(AB)⁻¹ = B⁻¹A⁻¹: the order reverses, and A⁻¹B⁻¹ is the wrong rule".
- Transpose and inverse · an inverse exists only for a square matrix with nonzero determinant; [[1,2],[3,4]] has det 1·4 − 2·3 = −2 and inverse [[−2,1],[3/2,−1/2]], with M⁻¹M = I; [[1,2],[2,4]] and the projection [[1,0],[0,0]] have none · Test: `inverse`, `inverse2ByFormula`, "an inverse exists only for…", "the 2×2 inverse formula agrees with the general inverse, and fails exactly when ad − bc = 0" (all integer 2×2 matrices with entries −3 to 3).
- Transpose and inverse · [[1,2],[2,4]] sends (2, 0) and (0, 1) to the same output (2, 4), so nothing can undo it · Test: "a singular matrix sends different inputs to the same output…".
- Transpose and inverse · I₂A = A and AI₃ = A for the 2×3 example; Aᵀ of [[1,2,3],[4,5,6]] is [[1,4],[2,5],[3,6]]; entry (3, 1) of Aᵀ is 3 · Test: "identity leaves every vector and matrix unchanged", "transpose swaps rows and columns…".
- Transpose and inverse · the determinant ad − bc is used on this card only as the test for an inverse; its meaning as signed area is shown on the Linear transformations card only for the unit square, "full treatment later" without naming a concept · Test: "the determinant is the signed area of the transformed unit square".
- Transpose and inverse · in the original Transformer the attention scores come from QKᵀ (softmax(QKᵀ/√d_k)V) · Source: Vaswani et al., 2017, §3.2.1, Eq. (1). Verify. The shapes (4 tokens, illustrative, with d_k = 64: 4×64 times 64×4 is 4×4, 1,024 multiplications) are Test: "attention-score shapes…".
- Transpose and inverse · the 64×512 query projection (d_k = 64, d_model = 512) is not square, so it has no inverse · Source: Vaswani et al., 2017, §3.2.2 and Table 3. Verify. Test: `isSquare` in "attention-score shapes…". Follows from the shapes alone; no claim about trained weights.
- Systems · a linear system has no solution, exactly one, or infinitely many, never exactly two · Test: "systems: none, exactly one, or infinitely many, never two", "…never exactly two, over a whole grid of lines" (2,500 systems with entries −2 to 2 and four right-hand sides; only none, one and infinite occur), and "a linear system with two different solutions has a whole line of them". The card's proof (A(x + t(y − x)) = b) is the same identity.
- Systems · x + y = 4 and x − y = 2 give (3, 1); adding gives 2x = 6; A⁻¹ = [[1/2,1/2],[1/2,−1/2]] with det −2; x + y = 4 with x + y = 6 has none (0 = 2); x + y = 4 with 2x + 2y = 8 has infinitely many ((1,3), (0,4) work) · Test: `solveSystem`, `inverse`, "systems: none, exactly one…", "a system A·x = b with an invertible A is solved by x = A⁻¹b".
- Systems · the receipts example (2 apples + 1 pear = 7, 4 apples + 2 pears = 14) has infinitely many prices · Test: "the receipts on the Systems card…". The other scenarios (mixing juice, paths crossing, budgets) are illustrative, with no numbers.
- Systems · [1 1](1, 3) = 4, the link back to Module 0, Equations · Test: "the Module 0 row".
- Systems · next-token probabilities must sum to 1; as one equation in V unknowns it leaves V − 1 free (V = 4: 3 free) · Source: definition of a probability distribution. Test: "next-token probabilities: one linear equation over V unknowns leaves V − 1 free". A real vocabulary has tens of thousands of tokens (the Exponents line cites about 37,000, Vaswani et al., 2017 §5.1; Verify). Non-negativity is stated as left out.
- Span and rank · one arrow spans a line; (1,0), (0,1) reach (5, −3) with 5 and −3; [[1,2],[2,4]] has rank 1; the 3×3 with columns (1,4,7), (2,5,8), (3,6,9) has rank 2 because column 3 = 2·column 2 − column 1; its transpose also has rank 2 · Test: "rank counts independent columns", "independence, span and basis", "rank facts used on the span card".
- Span and rank · rank is never more than the smaller of the number of rows and the number of columns · Basis: standard linear algebra (there are only that many independent columns, and row rank equals column rank); stated, no numbers. Test: `rank` on the 3×3 example (rank 2 ≤ 3) and the 2×2 examples.
- Span and rank · three vectors in the plane are always dependent; a price + tax = total table has rank 2 · Test: "independence, span and basis" and "a price + tax = total table has rank 2…".
- Span and rank · LoRA adds the product of a d×r and an r×k matrix (r much smaller than d and k), whose rank is at most r · Source: Hu et al., 2021, "LoRA: Low-Rank Adaptation of Large Language Models". Verify (cited from memory). Test: "a thin-times-thin product has rank at most the thin size…" (a 4×1 times 1×3 is 4×3, 12 entries, rank 1, stored with 7 numbers).
- Span and rank · for d = k = 512 (d_model, Vaswani et al., 2017, Table 3; Verify) and an illustrative r = 8: 512×512 = 262,144 entries versus r·(d + k) = 8,192 · Test: `lowRankEntryCount`, `entryCount`. The card says r = 8 is illustrative and that the paper studies several values; no claim about which layers or training.
- Linear transformations · a counter-clockwise rotation by θ with vectors as columns is [[cos θ, −sin θ], [sin θ, cos θ]]; 90° sends (1,0) to (0,1) and (0,1) to (−1,0); (3,2) goes to (−2,3); 30° keeps the length of (3,4) at 5 · Test: "rotation is counter-clockwise with vectors as columns", "rotation keeps length and area, and its inverse is its transpose". The drawn arc turns counter-clockwise on screen for positive θ (checked in the browser, `data-arc`).
- Linear transformations · shear [[1,k],[0,1]] sends (0,1) to (k,1), (3,2) to (7,2) for k = 2, area unchanged; scaling [[2,0],[0,3]] has area scale 6 and sends (1,1) to (2,3); a negative factor mirrors · Test: "scale and shear".
- Linear transformations · projection onto the x-axis [[1,0],[0,0]] has rank 1, no inverse, sends (3,2) and (3,−5) both to (3,0), and projecting twice changes nothing more · Test: "projection onto the x-axis has rank 1 and no inverse…".
- Linear transformations · the determinant here is only the signed area scale of the unit square (shoelace area of the image); a minus sign means flipped · Test: "the determinant is the signed area of the transformed unit square". Tolerance as above (rank2).
- Linear transformations · rotate 90° then shear is HR = [[1,−1],[1,0]]; the other order RH = [[0,−1],[1,1]] · Test: "transformations compose by matrix multiplication, and in the order written".
- Linear transformations · two bias-free linear maps with nothing between them are one matrix (W₂W₁ applied to (3, −1) matches applying W₁ then W₂); the Transformer's feed-forward layer has a ReLU between its two matrices, FFN(x) = max(0, xW₁ + b₁)W₂ + b₂; with a bias a layer is linear plus a shift · Test: "composition: …a bias-free stack of two linear layers collapses to one". Source: Vaswani et al., 2017, §3.3. Verify.
- Linear transformations · a uniform slide of the plane (the "Spot it") moves the origin, so it is not linear · Basis: a linear map sends 0 to 0 (the definition on the card); no numbers.
- Signposts · "Builds on" links: Transpose on Matrix multiplication; Systems on Matrix multiplication and Module 0 Equations (card text links to it); Span on Systems and Adding and scaling; Transformations on Matrices and Span (card text links back to Matrices) · Basis: the cross-references in the card text; suggestions, never locks.
- Focus rule · forward pointers removed: "(explored fully in the next part)" and "Ch 2.7 … in the next part" on Matrices, "(explored fully in the next part)" and "Ch 2.5 … in the next part" on Adding and scaling, "We will solve such systems in the next part" on Matrix multiplication, "coming in Module 1" in the Equations footer, and "Systems of equations, span … in the next part" on the Module 1 overview; "Before you open the next part, predict" is now "Before you continue, predict" on every page · Basis: `tools/lib/post-split-edits.mjs` lists each edit with its reason; `tests/split-preservation.test.mjs` reads the old pages through it. F1 removed the last two: "(next card)" in Slope and "we meet later" in Variables.
- Norms · ‖(3, 4)‖₂ = 5 (Pythagoras), ‖(3, 4)‖₁ = 7, ‖(1, 2, 2)‖₂ = 3, ‖(−2, 5)‖₁ = 7; L1 is never smaller than L2 and never more than √n times it · Test: "norm2 is Pythagoras…", "the L1 norm is never smaller than the L2 norm…", "norms are never negative…", "the triangle inequality holds for both norms".
- Norms · L2 regularisation adds a penalty proportional to the squared L2 norm of the weights to the loss, while weight decay shrinks the weights directly each step; they are equivalent for plain SGD (after rescaling by the learning rate) and not for adaptive optimisers such as Adam, where decoupled weight decay differs; AdamW is Adam with decoupled weight decay and a common choice for Transformers · Source: Loshchilov and Hutter, 2019, "Decoupled Weight Decay Regularization". Verify (cited from memory; "common choice" is a general-practice statement). Test for the SGD half: "L2 penalty and weight decay give the same step under plain SGD…" (w = (2, −1), gradient (0.5, 0.5), η = 0.1, λ = 0.01 gives (1.948, −1.049) both ways). The Adam half is stated, not computed. No claim about which penalty or strength any model uses.
- Distance · the distance of (1, 2) and (4, 6) is 5 in L2 and 7 in L1; (2, 5) and (6, 2) are 7 apart in L1 · Test: "distance is the norm of the difference, and is symmetric".
- Distance · embeddings are vectors, so a distance between two embeddings is defined · Conceptual. The card says it makes no claim about which measure any model or search system uses.
- Dot product · Σ aᵢbᵢ equals ‖a‖‖b‖cos θ · Test: "Σ aᵢbᵢ equals ‖a‖‖b‖cos θ on many vectors, in 2, 3 and 6 dimensions" (about 600 pairs, tolerance 1e-8).
- Dot product · the sign says same direction (positive), perpendicular (zero) or opposite (negative); (2, 3)·(4, −1) = 5; (3, 2)·(4, 0) = 12 · Test: "the sign of the dot product says…", "dot multiplies entry by entry…".
- Dot product · work = force · displacement; 20 N at 30° over 5 m is about 86.6 J, and a force at right angles does 0 · Test: "work is force · displacement…". Physical framing, no source needed.
- Dot product · the dot product is forced by being symmetric, linear in each arrow and equal to the squared length for a·a: a·b = (‖a+b‖² − ‖a‖² − ‖b‖²)/2 · Test: "the dot product can be recovered from lengths alone…".
- Dot product · the attention score between two tokens is the dot product of a query and a key (example q = (1, 0, 2), k = (2, 1, 1) gives 4, made-up numbers) · Source: Vaswani et al., 2017, §3.2. Verify. Test: "the card examples…" (the 4).
- Angle and cosine similarity · cosine similarity lies in [−1, 1], ignores positive scaling, flips sign with a negative factor, equals the dot product for unit vectors, and is undefined (null in code) for the zero vector · Test: "cosine similarity lies in [−1, 1]…", "cosine similarity ignores length…", "for unit vectors…", "the zero vector has no angle…". The acos argument is clamped: "parallel vectors never make acos fail…" (parallel and opposite pairs, including rounding-prone ones, and 2,000 random parallel pairs).
- Angle and cosine similarity · (1, 0) and (1, 1) are 45° apart (cosine 0.707); (3, 4) and (6, 8) have cosine similarity 1 · Test: "angleBetween: parallel is 0°…", "cosine similarity ignores length…".
- Angle and cosine similarity · embedding similarity search commonly uses cosine similarity or a dot product, the choice varying between systems; for vectors scaled to length 1 the two give the same ranking · Basis: general practice in vector-search tools, no single source, and not a statement about any model or company. Verify. The equality for unit vectors is tested ("for unit vectors the cosine similarity is the dot product").
- Orthogonality · a·b = 0 defines orthogonal; the zero vector is orthogonal to everything, itself included; (2, 1) and (−1, 2) are orthogonal; (2, 1) and (k, 4) are orthogonal for k = −2 · Test: "orthogonal means a·b = 0…", "orthogonal non-zero vectors are at 90°", "the card examples…".
- Orthogonality · no "In an LLM" claim · The stage is kept with an explicit "nothing specific to claim" line, since there is no documented language-model mechanism to state.
- Projections · proj of a onto b is ((a·b)/(b·b)) b; (3, 1) onto (1, 1) is (2, 2) with leftover (1, −1); (3, 4) onto (2, 0) is (3, 0); projecting onto (1, 0) gives (a₁, 0), the matrix from the Transformations card · Test: "projection of (3, 1) onto (1, 1)…", "projecting onto the x-axis direction (1, 0)…".
- Projections · the leftover a − proj is orthogonal to b (about 1,200 random pairs in 2, 3 and 7 dimensions), projecting twice changes nothing, the shadow length is (a·b)/‖b‖, and projecting onto the zero vector is undefined (null) · Test: "the leftover a − proj is orthogonal to b…", "projecting twice changes nothing more…", "the shadow length is…", "projecting onto the zero vector is undefined…".
- Projections · Transformer papers use "linear projections" for learned linear maps; these are not orthogonal projections; a learned 64×512 map cannot be applied twice · Source: Vaswani et al., 2017, §3.2.2. Verify. The shape claim follows from 64 ≠ 512 (the 64×512 shape is shown from `transformerBase`). No claim about what a trained matrix has learned.
- Why divide by √d_k · if the components of q and k are independent with mean 0 and variance 1, then q·k has mean 0 and variance d_k, so dividing by √d_k restores variance 1; d_k = 64 and the divisor is 8 in the base model · Source: Vaswani et al., 2017, §3.2.1 and its footnote on variance; Table 3 for d_k = 64. Verify. Test: "exact check, no sampling…" (all ±1 vectors, d = 1 to 5: mean 0, variance exactly d), and the seeded simulations. The card states the assumption and does not claim trained queries and keys have unit variance.
- Why divide by √d_k · measured variances, 20,000 pairs, d = 64, seed 2017: normal entries 63.6 for q·k and 0.99 after dividing by 8; ±1 entries 63.0 and 0.98 · Test: "simulation (normal, d = 64, 20000 pairs, seed 2017)…" and "(coin…)". Tolerance: 5% of 64 (about 3.2), which is about five standard errors (standard error of the sample variance ≈ 64·√(2/19999) ≈ 0.64, a little less for coins); mean within 0.3 (standard error ≈ 0.057). Also checked for d = 1, 4, 16, 64, 256 with both kinds of entry.
- Why divide by √d_k · the assumption matters: with entry variance 4 the variance of q·k is d·4·4 (256 for d = 16) and √d no longer restores 1 · Test: "the assumption matters…" (simulated, within 7%) and `dotVarianceFormula`.
- Why divide by √d_k · the paper's stated motivation is that large dot products push the softmax into regions with extremely small gradients · Source: Vaswani et al., 2017, §3.2.1. Verify. Stated in the card in plain words; not tested (it is the paper's argument, not a computed number).
- Signposts · "Builds on" links: Dot product on Sine and cosine (Module 0) and Matrix multiplication (Module 1); Projections on Linear transformations (Module 1) · Basis: cross-references in the card text; backward only. `check-course` fails on any forward link in a card, and `check-glossary` fails on a Learn more link that points forward (enforced from Module 2; Modules 0 and 1 hold 14 older forward Learn more links, counted but not failed).
- Glossary · variance, independent and square root carry no Learn more link because they are taught later (variance and independence in Module 5); the card explains each in one plain sentence · Basis: the forward-link rule above. "Softmax" is named once, on the last card, in plain words and without a glossary link.
