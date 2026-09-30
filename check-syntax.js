/**
 * 快速语法检查脚本
 * 使用 Node.js 检查 JavaScript 文件语法
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔍 检查 JavaScript 文件语法...\n');

const jsFiles = [
    'js/math-sdt.js',
    'js/game.js'
];

let hasError = false;

jsFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    console.log(`检查: ${file}`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // 使用 vm 模块检查语法
        new vm.Script(content, { filename: file });

        console.log(`  ✓ 语法正确\n`);
    } catch (error) {
        console.error(`  ✗ 语法错误: ${error.message}\n`);
        hasError = true;
    }
});

if (!hasError) {
    console.log('✅ 所有 JavaScript 文件语法检查通过！');
    process.exit(0);
} else {
    console.error('❌ 发现语法错误！');
    process.exit(1);
}
