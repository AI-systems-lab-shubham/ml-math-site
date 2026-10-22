# Curriculum

Order follows *Mathematics for Machine Learning* (MML), with extra modules where MML has no coverage (marked **outside MML**). Tick a module only when it meets the definition of done in `CLAUDE.md`.

Card sizes: **F** = full interactive card, **C** = compact card (mini diagram, same seven stages, shorter).

## Build phases
- **Phase 1:** design system, site shell, glossary engine, Module 0 (vertical slice for UX review).
- **Phase 2:** Modules 1 to 8, one or two per session.
- **Phase 3 (if usage allows):** Modules 9 and 10.

---

## [ ] Module 0: Foundations (high-school refresher). MML Ch 1 (motivation)
_Part 1 built (variables, equations, functions, slope, exponents). Part 2 to do: logarithms, Σ, ratios, sine and cosine, notation, then the full verification pass._
- Variables and expressions (C)
- **Equations, e.g. x + y = 4** (F): a rule linking quantities, not an instruction; one equation with two unknowns gives a line of solutions; two equations pin down a point. Real life: a fixed total split two ways (time, volume, mass conservation).
  *In an LLM:* next-token probabilities satisfy p₁ + … + p_V = 1 over the vocabulary; prompt tokens + output tokens must fit within the context window; a neuron's w·x + b = 0 is a line (or plane) through the data.
- Functions and graphs (F)
- Slope and linear functions, y = mx + b (F). *LLM:* a neuron is a weighted sum plus a bias.
- Exponents, growth and decay (F)
- **Logarithms** (F): a log counts steps (how many times you multiply by the base to get from 1 to the number); log(ab) = log a + log b; squeezes huge ranges. Spot it: decibels, pH, earthquake magnitude, octaves, bits. *LLM:* log-probabilities, bits per token, perplexity = exp(cross-entropy in nats).
- Σ notation (F). *LLM:* dot products and loss sums.
- Ratios, percentages, averages (C)
- Sine and cosine basics (C), needed for the dot-product angle
- Reading mathematical notation: subscripts, hats, ∈, ∀, vectors in bold (C)

## [ ] Module 1: Linear algebra. MML Ch 2
- Vectors as arrows and as lists (F). *LLM:* an embedding is a vector (the original Transformer base model uses d_model = 512).
- Vector addition, scaling, linear combinations (F)
- Matrices as tables and as machines (F). *LLM:* weights are matrices.
- Matrix-vector and matrix-matrix multiplication (F). *LLM:* most of a transformer's computation is matrix multiplication (Q, K, V projections, feed-forward layers); GPUs are built for it.
- Transpose, identity, inverse (C)
- Systems of linear equations (F), linking back to x + y = 4
- Span, linear independence, basis, rank (C)
- Linear transformations: rotate, scale, shear, project (F)

## [ ] Module 2: Analytic geometry. MML Ch 3
- Norms: L1 and L2 (F). *LLM:* weight decay penalises the L2 norm.
- Distance (C)
- **Dot product** (F): how much of one arrow lies along another (shadow); zero when perpendicular; scales with length. Spot it: work done by a force along a path, light on a tilted surface. *LLM:* attention scores are dot products of query and key vectors, scaled by √d_k.
- Angle and cosine similarity (F). *LLM:* embedding similarity search.
- Orthogonality (C)
- Projections (F)
- **Why divide by √d_k** (C, "How to arrive" = Derived): dot products of d-dimensional vectors with independent, zero-mean, unit-variance components have variance d, so scaling by √d keeps them stable before the softmax.

## [ ] Module 3: Matrix decompositions. MML Ch 4
- Determinant as area or volume scaling (C); trace (C)
- Eigenvalues and eigenvectors (F): directions a transformation only stretches. *LLM:* indirect; covariance eigenvectors underlie PCA; Hessian eigenvalues describe training curvature.
- Eigendecomposition (C)
- **SVD** (F): any matrix is rotate, stretch, rotate.
- Low-rank approximation (F). *LLM:* LoRA fine-tuning adds a low-rank update to weight matrices (Hu et al., 2021).

## [ ] Module 4: Vector calculus. MML Ch 5
- Functions and limits (C)
- Derivatives as slope and rate of change (F)
- Partial derivatives (F)
- **Chain rule** (F). *LLM:* backpropagation is the chain rule applied through the layers.
- **Gradients** (F): direction of steepest increase.
- Jacobians (C). Hessians (C): curvature. *LLM:* second-order information is rarely used at LLM scale because it is expensive.
- Taylor approximation (F): why a gradient step works locally.
- Backpropagation and automatic differentiation (F): a small computation graph with every number computed by tested code.

## [ ] Module 5: Probability and distributions. MML Ch 6
- Probability basics, events, rules (F)
- Conditional probability and independence (F)
- **Bayes' theorem** (F), with natural frequencies. *LLM:* a language model is not literally Bayesian. It outputs P(next token | previous tokens), and the chain rule of probability gives P(sequence) = ∏ P(tokenₜ | earlier tokens).
- Random variables (F); discrete vs continuous, PMF, PDF, CDF (C)
- Expectation and variance (F)
- Common distributions: Bernoulli, categorical, Gaussian (F). *LLM:* softmax outputs a categorical distribution.
- Covariance and correlation (F)
- Sampling and estimation (F). *LLM:* temperature and top-p sampling draw from the next-token distribution.

## [ ] Module 6: Continuous optimization. MML Ch 7
- Objective and loss functions (F)
- **Gradient descent** (F): walking downhill in fog by feeling the slope.
- Learning rate (F): too high overshoots, too low crawls.
- Stochastic gradient descent and mini-batches (F)
- Momentum (F)
- Adam (F, **outside MML**). *LLM:* Adam-family optimisers are widely used to train transformers.
- Convex vs non-convex, saddle points (C)
- Constrained optimisation and Lagrange multipliers (C)
- Learning-rate schedules and warmup (C). *LLM:* the original Transformer paper used a warmup schedule.

## [ ] Module 7: Information theory. **Outside MML**
- Information as surprise, −log p (F): why a log is forced (rarer = more informative; independent events add).
- Entropy (F). *LLM:* temperature changes the entropy of the output distribution.
- **Cross-entropy** (F). *LLM:* the training loss for next-token prediction.
- KL divergence (F). Relation: H(p, q) = H(p) + KL(p‖q).
- Mutual information (C). Information gain (F), used in decision trees.
- Coding and Huffman codes (C). *LLM:* bits per token and perplexity.

## [ ] Module 8: When models meet data. MML Ch 8
- Models as functions with parameters (F); the "From Math to ML" map (F)
- Empirical risk and loss (F)
- **Maximum likelihood** (F). *LLM:* minimising cross-entropy on next-token prediction is maximum likelihood.
- MAP and priors (C): L2 regularisation as a Gaussian prior
- Overfitting and underfitting (F); regularisation (F)
- Train, validation, test; cross-validation (F). *LLM:* validation loss.
- Bias and variance (C)

## [ ] Module 9: Models. MML Ch 9 to 12, plus extras
- Linear regression (F), MML Ch 9: least squares equals maximum likelihood under Gaussian noise
- PCA (F), MML Ch 10: variance maximisation equals low-rank approximation (SVD)
- Gaussian mixture models and EM (F), MML Ch 11
- Support vector machines (C), MML Ch 12
- Logistic regression and classification (F, **outside MML**), decision trees (F, **outside MML**), k-means (C, **outside MML**)
- *LLM:* a mixture of experts is a different mechanism; do not conflate it with a GMM.

## [ ] Module 10: Capstone. **Outside MML**
- The neuron and the multilayer perceptron; activations (F)
- Backpropagation through a small network, reusing the chain rule (F)
- Softmax with cross-entropy and its gradient (p − y) (F)
- Embeddings as a lookup table (C)
- Self-attention in a tiny worked example: softmax(QKᵀ/√d_k)V (F)
- A tiny next-token predictor trained live in the browser, with the loss falling. Label it clearly: a small demo, not a transformer. (F)
- The decoder-only stack at overview level (C): public knowledge only, with simplifications flagged
