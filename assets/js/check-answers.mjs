// The registry of numeric-answer functions that data/checks/*.json may name. Each is a thin call into tested maths
// (tests/decomposition-math.test.mjs); tests/checks.test.mjs pins the value each one returns.
import {
  det2, trace, eigenvalues2, discriminant2, svd, rankFromSingular, storageTruncated, storageLoRA, storageFull,
  bestErrorFrobSq, bestErrorSpectral, powerViaEigen, traceOfProduct3, matMul, frobeniusSq, signedArea, unitSquareImage, shapeOf,
} from "./decomposition-math.mjs";

export const answers = {
  det2: (A) => det2(A),
  trace: (A) => trace(A),
  traceOfProduct: (A, B) => trace(matMul(A, B)),
  traceOfProduct3: (A, B, C) => traceOfProduct3(A, B, C),
  areaOfUnitSquareImage: (A) => signedArea(unitSquareImage(A)),
  discriminant2: (A) => discriminant2(A),
  largerEigenvalue: (A) => eigenvalues2(A)[0],
  smallerEigenvalue: (A) => eigenvalues2(A)[1],
  powerEntry: (A, n, i, j) => powerViaEigen(A, n)[i][j],
  singularValue: (A, i) => svd(A).s[i],
  singularProduct: (A) => { const s = svd(A).s; return s.reduce((p, v) => p * v, 1); },
  sumSquaredEntries: (A) => frobeniusSq(A),
  rank: (A) => { const [m, n] = shapeOf(A); return rankFromSingular(svd(A).s, m, n); },
  storageTruncated: (m, n, k) => storageTruncated(m, n, k),
  storageLoRA: (m, n, r) => storageLoRA(m, n, r),
  storageFull: (m, n) => storageFull(m, n),
  errorFrobSq: (A, k) => bestErrorFrobSq(svd(A).s, k),
  errorSpectral: (A, k) => bestErrorSpectral(svd(A).s, k),
};
