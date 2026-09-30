/**
 * 信号检测论实验 - 游戏逻辑核心模块
 * 包含Canvas绘制、实验流程控制、数据记录等功能
 */

const SDTGame = (function() {
    // 实验状态
    let state = {
        phase: 'setup', // setup, playing, results
        totalTrials: 30,
        priorProbability: 0.5, // P(S)
        stimulusDuration: 1000, // ms
        difficulty: 0.5, // 0-1, 影响违禁品的透明度
        currentTrial: 0,
        results: [], // 存储每试次的结果
        currentStimulus: null, // 当前试次的刺激类型 (signal/noise)
        stimulusTimer: null,
        canvas: null,
        ctx: null
    };

    // Canvas 配置
    const canvasConfig = {
        width: 800,
        height: 500
    };

    /**
     * 初始化 Canvas
     */
    function initCanvas() {
        state.canvas = document.getElementById('xrayCanvas');
        if (!state.canvas) {
            console.error('Canvas元素未找到');
            return false;
        }

        state.ctx = state.canvas.getContext('2d');
        state.canvas.width = canvasConfig.width;
        state.canvas.height = canvasConfig.height;

        return true;
    }

    /**
     * 生成随机噪音（背景物品和噪点）
     */
    function generateNoise() {
        const noiseItems = [];

        // 生成随机几何图形模拟行李物品
        const shapes = ['circle', 'rectangle', 'triangle'];
        const itemCount = 8 + Math.floor(Math.random() * 7); // 8-15个物品

        for (let i = 0; i < itemCount; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const x = 100 + Math.random() * (canvasConfig.width - 200);
            const y = 100 + Math.random() * (canvasConfig.height - 200);
            const size = 30 + Math.random() * 50;
            const opacity = 0.3 + Math.random() * 0.4;

            // 随机颜色（模拟不同材质）
            const hue = Math.random() * 360;
            const color = `hsla(${hue}, 30%, ${40 + Math.random() * 30}%, ${opacity})`;

            noiseItems.push({ shape, x, y, size, color, opacity });
        }

        return noiseItems;
    }

    /**
     * 生成刀具信号
     */
    function generateKnifeSignal() {
        // 刀具参数
        return {
            x: canvasConfig.width / 2,
            y: canvasConfig.height / 2,
            rotation: Math.random() * Math.PI * 2,
            length: 150 + Math.random() * 30,
            width: 15 + Math.random() * 5
        };
    }

    /**
     * 绘制噪音场景
     */
    function drawNoise(noiseItems) {
        // 绘制背景
        state.ctx.fillStyle = '#0a0e17';
        state.ctx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);

        // 绘制网格背景（X光扫描效果）
        state.ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
        state.ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < canvasConfig.width; x += gridSize) {
            state.ctx.beginPath();
            state.ctx.moveTo(x, 0);
            state.ctx.lineTo(x, canvasConfig.height);
            state.ctx.stroke();
        }
        for (let y = 0; y < canvasConfig.height; y += gridSize) {
            state.ctx.beginPath();
            state.ctx.moveTo(0, y);
            state.ctx.lineTo(canvasConfig.width, y);
            state.ctx.stroke();
        }

        // 绘制背景噪点（模拟X光杂波）
        const noiseIntensity = 2000;
        for (let i = 0; i < noiseIntensity; i++) {
            const x = Math.random() * canvasConfig.width;
            const y = Math.random() * canvasConfig.height;
            const brightness = Math.random() * 255;
            state.ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${Math.random() * 0.1})`;
            state.ctx.fillRect(x, y, 1, 1);
        }

        // 绘制随机几何图形
        noiseItems.forEach(item => {
            state.ctx.save();
            state.ctx.fillStyle = item.color;
            state.ctx.translate(item.x, item.y);

            switch (item.shape) {
                case 'circle':
                    state.ctx.beginPath();
                    state.ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
                    state.ctx.fill();
                    break;

                case 'rectangle':
                    state.ctx.fillRect(-item.size / 2, -item.size / 2, item.size, item.size * 1.2);
                    break;

                case 'triangle':
                    state.ctx.beginPath();
                    state.ctx.moveTo(0, -item.size / 2);
                    state.ctx.lineTo(-item.size / 2, item.size / 2);
                    state.ctx.lineTo(item.size / 2, item.size / 2);
                    state.ctx.closePath();
                    state.ctx.fill();
                    break;
            }

            state.ctx.restore();
        });

        // 扫描线效果
        const scanY = (Date.now() % 3000) / 3000 * canvasConfig.height;
        const gradient = state.ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        state.ctx.fillStyle = gradient;
        state.ctx.fillRect(0, scanY - 10, canvasConfig.width, 20);
    }

    /**
     * 绘制刀具（信号）
     */
    function drawKnife(noiseItems, knife) {
        // 先绘制噪音
        drawNoise(noiseItems);

        // 绘制刀具
        state.ctx.save();
        state.ctx.translate(knife.x, knife.y);
        state.ctx.rotate(knife.rotation);

        // 计算透明度（基于难度）
        const alpha = 0.3 + state.difficulty * 0.7;

        // 刀身
        state.ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
        state.ctx.beginPath();
        state.ctx.rect(-knife.length / 2, -knife.width / 2, knife.length, knife.width);
        state.ctx.fill();

        // 刀尖
        state.ctx.beginPath();
        state.ctx.moveTo(knife.length / 2, 0);
        state.ctx.lineTo(knife.length / 2 - 30, -knife.width / 2);
        state.ctx.lineTo(knife.length / 2 - 30, knife.width / 2);
        state.ctx.closePath();
        state.ctx.fill();

        // 刀柄
        state.ctx.fillStyle = `rgba(80, 60, 40, ${alpha})`;
        state.ctx.beginPath();
        state.ctx.rect(-knife.length / 2 - 25, -knife.width * 0.8, 25, knife.width * 1.6);
        state.ctx.fill();

        // 刀身高光
        state.ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.3})`;
        state.ctx.fillRect(-knife.length / 2 + 10, -knife.width / 4, knife.length - 30, knife.width / 4);

        state.ctx.restore();
    }

    /**
     * 显示遮罩层
     */
    function showMask(message = '') {
        state.ctx.fillStyle = 'rgba(10, 14, 23, 0.95)';
        state.ctx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);

        if (message) {
            state.ctx.fillStyle = '#00d9ff';
            state.ctx.font = 'bold 36px monospace';
            state.ctx.textAlign = 'center';
            state.ctx.textBaseline = 'middle';
            state.ctx.shadowColor = '#00d9ff';
            state.ctx.shadowBlur = 20;
            state.ctx.fillText(message, canvasConfig.width / 2, canvasConfig.height / 2);
            state.ctx.shadowBlur = 0;
        }
    }

    /**
     * 生成试次（基于先验概率决定是signal还是noise）
     */
    function generateTrial() {
        state.currentStimulus = Math.random() < state.priorProbability ? 'signal' : 'noise';
        console.log(`第 ${state.currentTrial + 1} 试次，刺激类型: ${state.currentStimulus}`);
        return state.currentStimulus;
    }

    /**
     * 呈现刺激
     */
    function presentStimulus() {
        console.log('呈现刺激...');
        const noiseItems = generateNoise();

        if (state.currentStimulus === 'signal') {
            const knife = generateKnifeSignal();
            drawKnife(noiseItems, knife);
            console.log('绘制信号（含刀具）');
        } else {
            drawNoise(noiseItems);
            console.log('绘制噪音（无刀具）');
        }

        // 如果是限时刺激，设置定时器隐藏
        if (state.stimulusDuration !== 0) { // 0 表示无限制
            state.stimulusTimer = setTimeout(() => {
                hideStimulus();
            }, state.stimulusDuration);
        }
    }

    /**
     * 隐藏刺激
     */
    function hideStimulus() {
        showMask('请做出判断');
    }

    /**
     * 处理用户响应
     */
    function handleResponse(response) {
        try {
            console.log('处理响应:', response);

            // 清除刺激定时器
            if (state.stimulusTimer) {
                clearTimeout(state.stimulusTimer);
                state.stimulusTimer = null;
            }

            const stimulus = state.currentStimulus;
            console.log('当前刺激:', stimulus);

            let result;

            // 判断结果类型
            if (stimulus === 'signal' && response === 'alarm') {
                result = 'hit';
            } else if (stimulus === 'signal' && response === 'pass') {
                result = 'miss';
            } else if (stimulus === 'noise' && response === 'alarm') {
                result = 'fa'; // False Alarm
            } else if (stimulus === 'noise' && response === 'pass') {
                result = 'cr'; // Correct Rejection
            }

            console.log('结果:', result);

            // 记录结果
            state.results.push({
                trial: state.currentTrial,
                stimulus: stimulus,
                response: response,
                result: result
            });

            // 显示反馈
            showFeedback(result);

            // 延迟后进入下一试次
            setTimeout(() => {
                nextTrial();
            }, 500);
        } catch (error) {
            console.error('处理响应时出错:', error);
        }
    }

    /**
     * 显示反馈
     */
    function showFeedback(result) {
        let message, className;
        switch (result) {
            case 'hit':
                message = '✓ 击中';
                className = 'hit';
                break;
            case 'miss':
                message = '✗ 漏报';
                className = 'miss';
                break;
            case 'fa':
                message = '! 虚报';
                className = 'fa';
                break;
            case 'cr':
                message = '✓ 正确拒绝';
                className = 'cr';
                break;
        }

        // 创建反馈元素
        const feedback = document.createElement('div');
        feedback.className = `feedback ${className}`;
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, 800);
    }

    /**
     * 进入下一试次
     */
    function nextTrial() {
        state.currentTrial++;

        if (state.currentTrial >= state.totalTrials) {
            endExperiment();
        } else {
            // 更新进度条
            updateProgressBar();
            // 生成并呈现新刺激
            generateTrial();
            presentStimulus();
        }
    }

    /**
     * 更新进度条
     */
    function updateProgressBar() {
        const progress = (state.currentTrial / state.totalTrials) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `${state.currentTrial} / ${state.totalTrials}`;
        }
    }

    /**
     * 开始实验
     */
    function startExperiment() {
        // 重置状态
        state.currentTrial = 0;
        state.results = [];
        state.phase = 'playing'; // 重要：设置实验状态为进行中

        console.log('实验开始，phase:', state.phase);

        // 切换到游戏页面
        showPage('game');

        // 初始化Canvas
        initCanvas();

        // 显示初始提示
        showMask('准备开始');

        // 延迟后开始第一试次
        setTimeout(() => {
            generateTrial();
            presentStimulus();
            updateProgressBar();
        }, 1500);
    }

    /**
     * 结束实验
     */
    function endExperiment() {
        state.phase = 'results';

        // 计算SDT指标
        const hitCount = state.results.filter(r => r.result === 'hit').length;
        const missCount = state.results.filter(r => r.result === 'miss').length;
        const faCount = state.results.filter(r => r.result === 'fa').length;
        const crCount = state.results.filter(r => r.result === 'cr').length;

        const sdtMetrics = SDTMath.calculateSDT(hitCount, missCount, faCount, crCount);

        // 显示结果页面
        showResults(sdtMetrics);

        // 切换到结果页面
        showPage('results');
    }

    /**
     * 显示结果
     */
    function showResults(metrics) {
        // 更新基本指标
        document.getElementById('hitCount').textContent = metrics.hitCount;
        document.getElementById('missCount').textContent = metrics.missCount;
        document.getElementById('faCount').textContent = metrics.faCount;
        document.getElementById('crCount').textContent = metrics.crCount;

        // 更新概率指标
        document.getElementById('pHit').textContent = (metrics.pHit * 100).toFixed(1) + '%';
        document.getElementById('pFA').textContent = (metrics.pFA * 100).toFixed(1) + '%';
        document.getElementById('accuracy').textContent = (metrics.accuracy * 100).toFixed(1) + '%';

        // 更新SDT核心指标
        document.getElementById('dPrime').textContent = metrics.dPrime.toFixed(3);
        document.getElementById('criterion').textContent = metrics.criterion.toFixed(3);

        // 绘制图表
        drawCharts(metrics);
    }

    /**
     * 绘制图表（ROC曲线和正态分布）
     */
    function drawCharts(metrics) {
        // 绘制ROC曲线
        drawROCCurve(metrics);

        // 绘制正态分布图
        drawNormalDistributions(metrics);
    }

    /**
     * 绘制ROC曲线
     */
    function drawROCCurve(metrics) {
        const canvas = document.getElementById('rocChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清空画布
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        // 绘制网格
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = gridSize; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = gridSize; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 绘制对角线（随机猜测线）
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(40, height - 40);
        ctx.lineTo(width - 40, 40);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制理论ROC曲线（基于当前d'）
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const margin = 40;
        const plotWidth = width - 2 * margin;
        const plotHeight = height - 2 * margin;

        for (let i = 0; i <= 100; i++) {
            const pFA = i / 100;
            // ROC曲线: P(Hit) = Φ(μ_s + d') 其中 μ_n = -d'/2, μ_s = d'/2
            // 使用 d' = zHit - zFA => zHit = zFA + d'
            const zFA = SDTMath.zScore(pFA);
            const zHit = zFA + metrics.dPrime;
            const pHit = SDTMath.normalCDF(zHit);

            const x = margin + pFA * plotWidth;
            const y = height - margin - pHit * plotHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 绘制用户实际工作点
        const userX = margin + metrics.pFA * plotWidth;
        const userY = height - margin - metrics.pHit * plotHeight;

        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(userX, userY, 8, 0, Math.PI * 2);
        ctx.fill();

        // 绘制坐标轴标签
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('虚报率 (P(FA))', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('击中率 (P(Hit))', 0, 0);
        ctx.restore();

        // 添加标题
        ctx.fillStyle = '#00d9ff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ROC 曲线', width / 2, 25);
    }

    /**
     * 绘制正态分布图
     */
    function drawNormalDistributions(metrics) {
        const canvas = document.getElementById('distChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清空画布
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        // 绘制网格
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = gridSize; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = gridSize; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 计算正态分布曲线
        const margin = 40;
        const plotWidth = width - 2 * margin;
        const plotHeight = height - 2 * margin;

        // X轴范围 (-4 到 4)
        const xMin = -4;
        const xMax = 4;

        // 找到最大Y值用于缩放
        let maxY = 0;
        for (let i = 0; i <= 100; i++) {
            const x = xMin + (i / 100) * (xMax - xMin);
            const yNoise = normalPDF(x);
            const ySignal = normalPDF(x - metrics.dPrime);
            maxY = Math.max(maxY, yNoise, ySignal);
        }

        const scaleY = plotHeight * 0.8 / maxY;

        // 绘制噪音分布 (N)
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = xMin + (i / 100) * (xMax - xMin);
            const y = normalPDF(x) * scaleY;
            const canvasX = margin + ((x - xMin) / (xMax - xMin)) * plotWidth;
            const canvasY = height - margin - y;

            if (i === 0) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        ctx.stroke();

        // 绘制信号分布 (S)
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.8)';
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = xMin + (i / 100) * (xMax - xMin);
            const y = normalPDF(x - metrics.dPrime) * scaleY;
            const canvasX = margin + ((x - xMin) / (xMax - xMin)) * plotWidth;
            const canvasY = height - margin - y;

            if (i === 0) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        ctx.stroke();

        // 绘制判断标准线 (c)
        const criterionX = margin + ((metrics.criterion - xMin) / (xMax - xMin)) * plotWidth;

        ctx.strokeStyle = 'rgba(255, 136, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(criterionX, margin);
        ctx.lineTo(criterionX, height - margin);
        ctx.stroke();
        ctx.setLineDash([]);

        // 标注
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';

        // 图例
        ctx.fillStyle = 'rgba(0, 217, 255, 0.8)';
        ctx.fillRect(width - 150, 50, 20, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('噪音 (N)', width - 120, 65);

        ctx.fillStyle = 'rgba(255, 51, 102, 0.8)';
        ctx.fillRect(width - 150, 80, 20, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('信号 (S)', width - 120, 95);

        ctx.fillStyle = 'rgba(255, 136, 0, 0.8)';
        ctx.fillRect(width - 150, 110, 20, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`判断标准 (c=${metrics.criterion.toFixed(2)})`, width - 120, 125);

        // d'标注
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`d' = ${metrics.dPrime.toFixed(3)}`, width / 2, 50);

        // 坐标轴标签
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('观察强度', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('概率密度', 0, 0);
        ctx.restore();

        // 添加标题
        ctx.fillStyle = '#00d9ff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('双正态分布模型', width / 2, 25);
    }

    /**
     * 正态分布概率密度函数
     */
    function normalPDF(x) {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    }

    /**
     * 切换页面
     */
    function showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageName + 'Page').classList.add('active');
    }

    /**
     * 绑定事件处理
     */
    function bindEvents() {
        // 开始按钮
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', startExperiment);
        }

        // 返回按钮
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                showPage('setup');
            });
        }

        // 重新开始按钮
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                showPage('setup');
            });
        }

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (state.phase !== 'playing') return;

            if (e.key === 'ArrowLeft' || e.key === 'j') {
                // 左键或J键 = 放行
                e.preventDefault();
                handleResponse('pass');
            } else if (e.key === 'ArrowRight' || e.key === 'f') {
                // 右键或F键 = 报警
                e.preventDefault();
                handleResponse('alarm');
            }
        });

        // 点击按钮控制
        const passBtn = document.getElementById('passBtn');
        const alarmBtn = document.getElementById('alarmBtn');

        if (passBtn) {
            passBtn.addEventListener('click', (e) => {
                console.log('放行按钮被点击，phase:', state.phase);
                if (state.phase === 'playing') {
                    console.log('执行放行操作');
                    handleResponse('pass');
                } else {
                    console.warn('实验未在进行中，无法响应');
                }
            });
        }

        if (alarmBtn) {
            alarmBtn.addEventListener('click', (e) => {
                console.log('报警按钮被点击，phase:', state.phase);
                if (state.phase === 'playing') {
                    console.log('执行报警操作');
                    handleResponse('alarm');
                } else {
                    console.warn('实验未在进行中，无法响应');
                }
            });
        }

        // 配置项监听
        setupConfigListeners();
    }

    /**
     * 设置配置项监听器
     */
    function setupConfigListeners() {
        // 试次数
        const trialsInput = document.getElementById('totalTrials');
        if (trialsInput) {
            trialsInput.addEventListener('change', (e) => {
                state.totalTrials = Math.max(20, parseInt(e.target.value) || 30);
                e.target.value = state.totalTrials;
            });
        }

        // 先验概率
        const priorSlider = document.getElementById('priorProbability');
        if (priorSlider) {
            priorSlider.addEventListener('input', (e) => {
                state.priorProbability = parseInt(e.target.value) / 100;
                document.getElementById('priorValue').textContent = state.priorProbability.toFixed(2);
            });
        }

        // 刺激呈现时间
        const durationSelect = document.getElementById('stimulusDuration');
        if (durationSelect) {
            durationSelect.addEventListener('change', (e) => {
                state.stimulusDuration = parseInt(e.target.value);
            });
        }

        // 难度调节
        const difficultySlider = document.getElementById('difficulty');
        if (difficultySlider) {
            difficultySlider.addEventListener('input', (e) => {
                state.difficulty = parseInt(e.target.value) / 100;
                document.getElementById('difficultyValue').textContent = (state.difficulty * 100).toFixed(0) + '%';
            });
        }
    }

    /**
     * 初始化游戏
     */
    function init() {
        bindEvents();
        console.log('SDT Game initialized');
    }

    // 公开API
    return {
        init: init,
        startExperiment: startExperiment,
        state: state
    };
})();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SDTGame.init);
} else {
    SDTGame.init();
}
