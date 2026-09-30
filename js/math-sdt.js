/**
 * 信号检测论(SDT)数学计算模块
 * 实现 Z-score 计算、正态分布函数等核心数学逻辑
 *
 * 信号检测论核心公式:
 * - d' (敏感性) = Z(P(Hit)) - Z(P(FA))
 * - c (判断标准) = -0.5 * (Z(P(Hit)) + Z(P(FA)))
 */

const SDTMath = (function() {
    /**
     * 标准正态分布的累积分布函数 (CDF)
     * 使用误差函数 erf() 计算
     * Φ(z) = 0.5 * (1 + erf(z / √2))
     *
     * @param {number} z - Z分数
     * @returns {number} 累积概率 P(Z ≤ z)
     */
    function normalCDF(z) {
        // 使用 Abramowitz and Stegun 近似公式 (误差函数)
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z >= 0 ? 1 - prob : prob;
    }

    /**
     * 简化的 Z分数计算（使用二分法逼近）
     *
     * @param {number} p - 累积概率 (0 < p < 1)
     * @returns {number} Z分数
     */
    function zScore(p) {
        // 极端情况处理
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;

        // 使用二分查找逼近 Z 分数
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

    /**
     * 对概率进行边缘校正
     * 当 P=0 或 P=1 时，使用 1/(2N) 和 1-1/(2N) 进行校正
     *
     * @param {number} p - 原始概率
     * @param {number} N - 试次总数
     * @returns {number} 校正后的概率
     */
    function adjustProbability(p, N) {
        if (p === 0) return 1 / (2 * N);
        if (p === 1) return 1 - 1 / (2 * N);
        return p;
    }

    /**
     * 计算信号检测论核心指标
     *
     * @param {number} hitCount - 击中次数
     * @param {number} missCount - 漏报次数
     * @param {number} faCount - 虚报次数
     * @param {number} crCount - 正确拒绝次数
     * @returns {Object} 包含 d'、c、P(Hit)、P(FA) 等指标
     */
    function calculateSDT(hitCount, missCount, faCount, crCount) {
        const totalSignal = hitCount + missCount;  // 信号试次总数
        const totalNoise = faCount + crCount;       // 噪音试次总数

        // 原始概率
        const pHit = totalSignal > 0 ? hitCount / totalSignal : 0;
        const pFA = totalNoise > 0 ? faCount / totalNoise : 0;

        // 边缘校正
        const totalTrials = hitCount + missCount + faCount + crCount;
        const adjustedPHit = adjustProbability(pHit, totalTrials);
        const adjustedPFA = adjustProbability(pFA, totalTrials);

        // 计算 Z分数
        const zHit = zScore(adjustedPHit);
        const zFA = zScore(adjustedPFA);

        // 计算 d' (敏感性指标)
        const dPrime = zHit - zFA;

        // 计算 c (判断标准指标)
        const criterion = -0.5 * (zHit + zFA);

        // 计算其他指标
        const accuracy = (hitCount + crCount) / totalTrials;

        return {
            pHit: pHit,
            pFA: pFA,
            adjustedPHit: adjustedPHit,
            adjustedPFA: adjustedPFA,
            zHit: zHit,
            zFA: zFA,
            dPrime: dPrime,
            criterion: criterion,
            accuracy: accuracy,
            hitCount: hitCount,
            missCount: missCount,
            faCount: faCount,
            crCount: crCount,
            totalSignal: totalSignal,
            totalNoise: totalNoise
        };
    }

    // 公开API
    return {
        normalCDF: normalCDF,
        zScore: zScore,
        adjustProbability: adjustProbability,
        calculateSDT: calculateSDT
    };
})();
