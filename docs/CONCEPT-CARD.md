# Concept Card

Every concept, function and formula gets a card. Nothing is too simple (x + y = 4 included). The goal: a learner understands it well enough to **recognise it in the physical world** and to explain it to someone else.

## The seven stages (in this order)

1. **Meaning.** The mechanism in plain words first, no symbols. Then the notation, introduced piece by piece.
   Example: *a logarithm counts steps*: how many times you multiply by the base to get from 1 to the number. Then `log₂ 8 = 3`.
2. **Picture.** An interactive diagram the learner can manipulate. Direct manipulation, immediate feedback, controls below the drawing.
3. **Real life.** Three to five physical processes or everyday scenarios where it operates, then a **recognition rule** ("if you see X, think Y"), then a **Spot it** exercise: a short real scenario (an earthquake report, a battery drain curve, a sled pulled at an angle) where the learner names the concept and why.
4. **Worked example.** One concrete numeric case, one step at a time, with every number produced by tested code.
5. **Why and when.** The problem it solves and what goes wrong without it. When it fits, when it does not, and what to reach for instead.
6. **How to arrive at it.** A guided "reinvent it" sequence: the requirements, the obvious candidates, why they fail, why this one remains. The learner predicts before the reveal. Tag the result:
   - **Derived**: forced by the requirements (the log in information; the √d_k scaling).
   - **Motivated**: a good fit among several (ReLU as an activation).
   - **Convention**: a choice we could have made differently (natural log vs log base 2, which only changes units).
   - **Design choice**: an engineering decision justified mainly by results (learning-rate warmup). Say what problem it patches. Do not invent a physical story.
7. **In an LLM.** Where it appears in a language model. State the claim precisely, from publicly documented work, and say what is simplified. If the link is only conceptual, say so. Never claim knowledge of any company's proprietary systems.

## Physical significance
Give it wherever one genuinely exists (dot product as shadow, gradient as steepest uphill, Hessian as curvature, eigenvector as a direction that only stretches, Bayes as updating belief). Where none exists (cross-validation, for example), say so and describe the problem the concept solves. Do not force a physical story.

## Checks
- **Predict-then-reveal:** the learner commits an answer first. Feedback explains why, in plain language. Wrong answers are information, never punishment (amber, not red).
- **Spot it:** scenario to concept, as above.
- **Explain it back:** a free-text prompt with a model answer to compare against.

## The "Teach it" panel (end of every full card)
- A 60-second spoken explanation
- One everyday analogy, and where it breaks down
- A whiteboard sequence (what to draw, in order)
- Three questions learners usually ask, with answers
- One common misconception

## Full vs compact cards
- **Full (F):** all seven stages with an interactive picture and the Teach it panel.
- **Compact (C):** all seven stages, shorter, with a small static or lightly interactive diagram. Teach it panel reduced to the analogy and one misconception.

## Writing rules
- One idea per section. Short paragraphs. Define each symbol where it first appears.
- Derivations and extras go in collapsibles. The main path stays readable on its own.
- Link every technical term through the glossary system.
- Cite MML chapters as further reading, in the card footer. Do not copy text or figures.

## Skeleton
```html
<article class="concept-card" id="concept-dot-product" data-size="full">
  <h2>Dot product</h2>
  <section data-stage="meaning">…</section>
  <section data-stage="picture"><div class="widget">…</div></section>
  <section data-stage="real-life">…<div class="spot-it">…</div></section>
  <section data-stage="worked-example">…</section>
  <section data-stage="why-when">…</section>
  <section data-stage="how-to-arrive"><span class="badge badge-derived">Derived</span>…</section>
  <section data-stage="in-an-llm">…</section>
  <details class="teach-it">…</details>
  <footer>Further reading: MML Ch 3.</footer>
</article>
```
