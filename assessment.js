"use strict";

const bigInt = require("big-integer");
const fs = require("fs");

/**
 * Compute GCD of two big integers using the Euclidean algorithm.
 */
function gcd(a, b) {
  a = a.abs();
  b = b.abs();
  while (!b.eq(0)) {
    let t = b;
    b = a.mod(b);
    a = t;
  }
  return a;
}

/**
 * Rational Lagrange interpolation at x=0.
 */
function findConstantTermRational(selectedPoints) {
  const k = selectedPoints.length;
  let resultNum = bigInt(0);
  let resultDen = bigInt(1);

  for (let j = 0; j < k; j++) {
    const { x: xj, y: yj } = selectedPoints[j];
    let basisNum = bigInt(1);
    let basisDen = bigInt(1);

    for (let i = 0; i < k; i++) {
      if (i === j) continue;
      const xi = selectedPoints[i].x;
      basisNum = basisNum.multiply(xi.negate()); // (-x_i)
      basisDen = basisDen.multiply(xj.subtract(xi)); // (x_j - x_i)
    }

    if (basisDen.eq(0)) {
      return "Error: Division by zero in basis denominator.";
    }

    const termNum = yj.multiply(basisNum);
    const termDen = basisDen;

    // Add fractions: a/b + c/d = (ad + bc) / bd
    const newNum = resultNum.multiply(termDen).add(termNum.multiply(resultDen));
    const newDen = resultDen.multiply(termDen);

    // Simplify the new fraction by dividing by their GCD
    const commonDivisor = gcd(newNum, newDen);
    resultNum = newNum.divide(commonDivisor);
    resultDen = newDen.divide(commonDivisor);
  }

  // Normalize sign
  if (resultDen.isNegative()) {
    resultNum = resultNum.negate();
    resultDen = resultDen.negate();
  }

  if (resultDen.eq(1)) {
    return resultNum.toString();
  } else {
    return `${resultNum.toString()}/${resultDen.toString()}`;
  }
}

/**
 * Top-level function to parse JSON and validate data.
 */
function findConstantTerm(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (
      !data.keys ||
      typeof data.keys.n !== "number" ||
      typeof data.keys.k !== "number"
    ) {
      return "Error: Missing or invalid 'keys' object with numeric 'n' and 'k'.";
    }
    const { n, k } = data.keys;
    if (!Number.isInteger(k) || k <= 0 || !Number.isInteger(n) || n < k) {
      return "Error: 'k' must be a positive integer and 'n' must be >= 'k'.";
    }

    const points = [];
    for (const key of Object.keys(data)) {
      if (key === "keys") continue;
      const point = data[key];
      if (!point || !point.base || !point.value)
        return `Error: Point '${key}' missing 'base' or 'value'.`;

      const { base, value } = point;
      const b = parseInt(base, 10);
      if (isNaN(b) || b < 2 || b > 36)
        return `Error: Invalid base '${base}' for point '${key}'.`;

      let x, y;
      try {
        x = bigInt(key);
      } catch {
        return `Error: Invalid x coordinate '${key}'.`;
      }
      try {
        y = bigInt(value, b);
      } catch {
        return `Error: Invalid value '${value}' in base ${base} for '${key}'.`;
      }

      points.push({ x, y });
    }

    if (points.length < k)
      return `Error: Not enough points (${points.length}) to satisfy k=${k}.`;

    points.sort((a, b) => a.x.compare(b.x));
    const selected = points.slice(0, k);

    // duplicate x check
    const seen = new Set();
    for (const { x } of selected) {
      const xs = x.toString();
      if (seen.has(xs)) return `Error: Duplicate x values detected (x=${xs}).`;
      seen.add(xs);
    }

    return findConstantTermRational(selected);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return "Error: Invalid JSON syntax.";
    }
    return `Error: ${error.message}`;
  }
}

/**
 * Test harness: load explicit JSON files
 */
function runTestFromFile(filename) {
  try {
    const jsonData = fs.readFileSync(filename, "utf8");
    const result = findConstantTerm(jsonData);
    console.log(`Result from ${filename}: ${result}`);
  } catch (err) {
    console.error(`Failed to read file ${filename}: ${err.message}`);
  }
}

// Run all tests
["test1.json", "test2.json"].forEach(
  runTestFromFile
);

module.exports = { findConstantTerm };
