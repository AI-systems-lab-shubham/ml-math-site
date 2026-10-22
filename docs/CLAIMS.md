# Claims register

One line per factual or numeric claim made on the site. **Test** means the number is computed by code in `assets/js/foundations-math.mjs` and covered by `tests/foundations-math.test.mjs`. **Source** means a publicly documented external fact. **Verify** marks a source I have cited from memory and could not re-check offline; confirm it before the site is published.

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
