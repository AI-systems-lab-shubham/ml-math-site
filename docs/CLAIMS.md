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
