// ml/riskEngine.js
//
// Loads risk_model.onnx once at server startup and runs in-process
// inference on every request after that — no Python process at request
// time (see README architecture diagram).
//
// Tensor names below were extracted directly from your actual
// risk_model.onnx binary (not guessed) — confirmed via a raw string scan:
//   input node:  "input"           — float32, shape [N, 14]
//   outputs:     "label"           — int64,   shape [N]      (0=Stable, 1=Watchlist)
//                "probabilities"   — float32, shape [N, 2]   (zipmap:False, per train_and_export.py)
// This matches train_and_export.py's y = (risk_category == 'Watchlist').astype(int),
// so class index 1 in `probabilities` is the Watchlist probability.

const ort = require('onnxruntime-web');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, 'model');
const FEATURES = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'features.json'), 'utf8'));
const FEATURE_IMPORTANCE = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'feature_importance.json'), 'utf8'));

let session = null;

async function loadModel() {
  const modelPath = path.join(MODEL_DIR, 'risk_model.onnx');
  session = await ort.InferenceSession.create(modelPath);
  console.log(`[riskEngine] ONNX risk model loaded — ${FEATURES.length} features`);
  // Defensive logging: if a future re-export of the model ever changes these
  // names, this line makes the mismatch immediately visible in the server
  // log instead of silently producing wrong predictions.
  console.log(`[riskEngine] Input: ${session.inputNames.join(', ')} | Output: ${session.outputNames.join(', ')}`);
}

function topFactorsFor(featurePayload) {
  return Object.entries(FEATURE_IMPORTANCE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([feature, importance]) => ({
      feature,
      importance,
      value: featurePayload[feature],
    }));
}

async function predictRisk(featurePayload) {
  if (!session) throw new Error('Model not loaded — loadModel() must be awaited at server startup');

  const inputArray = new Float32Array(FEATURES.map(f => Number(featurePayload[f])));
  const tensor = new ort.Tensor('float32', inputArray, [1, FEATURES.length]);

  const results = await session.run({ input: tensor });

  const probs = results.probabilities.data; // Float32Array, length 2: [P(Stable), P(Watchlist)]
  const watchlistProbability = Number(probs[1]);
  const riskCategory = watchlistProbability >= 0.5 ? 'Watchlist' : 'Stable';

  return {
    riskCategory,
    watchlistProbability,
    topFactors: topFactorsFor(featurePayload),
  };
}

module.exports = { loadModel, predictRisk, FEATURES };
