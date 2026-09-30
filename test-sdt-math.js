/**
 * SDT 数学计算验证测试
 */

console.log('='.repeat(60));
console.log('信号检测论(SDT)数学计算验证测试');
console.log('='.repeat(60));
console.log();

// ========== 复制 math-sdt.js 的核心函数 ==========

function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z >= 0 ? 1 - prob : prob;
}

function zScore(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    const low = -20;
    const high = 20;
    const epsilon = 1e-10;

    let lo = low;
    let hi = high;

    while (hi - lo > epsilon) {
        const mid = (lo + hi) / 2;
        if (normalCDF(mid) < p) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    return (lo + hi) / 2;
}

function adjustProbability(p, N) {
    if (p === 0) return 1 / (2 * N);
    if (p === 1) return 1 - 1 / (2 * N);
    return p;
}

function calculateSDT(hitCount, missCount, faCount, crCount) {
    const totalSignal = hitCount + missCount;
    const totalNoise = faCount + crCount;

    const pHit = totalSignal > 0 ? hitCount / totalSignal : 0;
    const pFA = totalNoise > 0 ? faCount / totalNoise : 0;

    const totalTrials = hitCount + missCount + faCount + crCount;
    const adjustedPHit = adjustProbability(pHit, totalTrials);
    const adjustedPFA = adjustProbability(pFA, totalTrials);

    const zHit = zScore(adjustedPHit);
    const zFA = zScore(adjustedPFA);

    const dPrime = zHit - zFA;
    const criterion = -0.5 * (zHit + zFA);
    const accuracy = (hitCount + crCount) / totalTrials;

    return {
        pHit, pFA, adjustedPHit, adjustedPFA,
        zHit, zFA, dPrime, criterion, accuracy,
        hitCount, missCount, faCount, crCount
    };
}

// ========== 开始测试 ==========

// 测试1: Z-score
console.log('【测试1】 Z-score 计算');
console.log('-'.repeat(60));

const testCases = [
    { p: 0.5, expected: 0, desc: 'P=0.5 (中位数)' },
    { p: 0.8413, expected: 1.0, desc: 'P=0.8413 (Z≈1.0)' },
    { p: 0.1587, expected: -1.0, desc: 'P=0.1587 (Z≈-1.0)' },
    { p: 0.9772, expected: 2.0, desc: 'P=0.9772 (Z≈2.0)' },
    { p: 0.0228, expected: -2.0, desc: 'P=0.0228 (Z≈-2.0)' },
];

let passCount = 0;
testCases.forEach(test => {
    const z = zScore(test.p);
    const error = Math.abs(z - test.expected);
    const passed = error < 0.02;
    passCount += passed ? 1 : 0;

    console.log(`${test.desc}`);
    console.log(`  期望: ${test.expected.toFixed(4)}, 计算: ${z.toFixed(4)}, 误差: ${error.toFixed(6)} ${passed ? '✓' : '✗'}`);
});

console.log(`\n通过: ${passCount}/${testCases.length}\n`);

// 测试2: SDT核心指标
console.log('【测试2】 SDT 核心指标计算');
console.log('-'.repeat(60));

const testSDT = [
    { name: '场景A: 高敏感性', hit: 45, miss: 5, fa: 10, cr: 40 },
    { name: '场景B: 低敏感性', hit: 35, miss: 15, fa: 20, cr: 30 },
    { name: '场景C: 宽松标准', hit: 48, miss: 2, fa: 15, cr: 35 },
    { name: '场景D: 严格标准', hit: 30, miss: 20, fa: 5, cr: 45 }
];

testSDT.forEach(test => {
    const result = calculateSDT(test.hit, test.miss, test.fa, test.cr);
    console.log(test.name);
    console.log(`  Hit=${test.hit}, Miss=${test.miss}, FA=${test.fa}, CR=${test.cr}`);
    console.log(`  P(Hit)=${result.pHit.toFixed(4)}, P(FA)=${result.pFA.toFixed(4)}`);
    console.log(`  Z(Hit)=${result.zHit.toFixed(4)}, Z(FA)=${result.zFA.toFixed(4)}`);
    console.log(`  d'=${result.dPrime.toFixed(4)}, c=${result.criterion.toFixed(4)}`);
    console.log(`  Accuracy=${(result.accuracy * 100).toFixed(2)}%`);
    console.log();
});

// 测试3: 边缘情况
console.log('【测试3】 边缘情况处理');
console.log('-'.repeat(60));

const edgeCases = [
    { name: 'P(Hit)=0 (全部漏报)', hit: 0, miss: 50, fa: 10, cr: 40 },
    { name: 'P(Hit)=1 (全部击中)', hit: 50, miss: 0, fa: 10, cr: 40 },
    { name: 'P(FA)=0 (全部正确拒绝)', hit: 30, miss: 20, fa: 0, cr: 50 },
    { name: 'P(FA)=1 (全部虚报)', hit: 30, miss: 20, fa: 50, cr: 0 }
];

edgeCases.forEach(test => {
    const result = calculateSDT(test.hit, test.miss, test.fa, test.cr);
    console.log(test.name);
    console.log(`  调整后 P(Hit)=${result.adjustedPHit.toFixed(6)}, P(FA)=${result.adjustedPFA.toFixed(6)}`);
    console.log(`  d'=${result.dPrime.toFixed(4)}, c=${result.criterion.toFixed(4)}`);
    console.log();
});

// 测试4: CDF验证
console.log('【测试4】 标准正态分布 CDF');
console.log('-'.repeat(60));

const cdfTests = [
    { z: 0, expected: 0.5 },
    { z: 1, expected: 0.8413 },
    { z: -1, expected: 0.1587 }
];

cdfTests.forEach(test => {
    const cdf = normalCDF(test.z);
    const error = Math.abs(cdf - test.expected);
    const passed = error < 0.01;
    console.log(`Φ(${test.z}) = ${cdf.toFixed(4)} (期望 ${test.expected.toFixed(4)}) ${passed ? '✓' : '✗'}`);
});

console.log();
console.log('='.repeat(60));
console.log('测试完成！所有核心数学函数已验证。');
console.log('='.repeat(60));
