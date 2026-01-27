#!/bin/bash

echo "=== 测试调度器初始化 ==="
echo ""

# 检查 next.config.ts 是否有 instrumentationHook 配置
echo "1. 检查 next.config.ts 配置..."
if grep -q "instrumentationHook: true" next.config.ts; then
    echo "   ✓ 已配置 instrumentationHook: true"
else
    echo "   ✗ 未配置 instrumentationHook: true"
fi
echo ""

# 检查 instrumentation.ts 是否存在
echo "2. 检查 instrumentation.ts 文件..."
if [ -f "instrumentation.ts" ]; then
    echo "   ✓ instrumentation.ts 存在"
else
    echo "   ✗ instrumentation.ts 不存在"
fi
echo ""

# 检查是否已构建
echo "3. 检查是否已构建..."
if [ -d ".next/standalone" ]; then
    echo "   ✓ 已构建 standalone 版本"
    echo "   ⚠️  注意：需要重新构建才能应用新配置"
else
    echo "   - 未构建 standalone 版本"
fi
echo ""

echo "4. 建议的测试步骤："
echo "   a) 重新构建：npm run build"
echo "   b) 启动生产服务器：npm start"
echo "   c) 查看日志，应该看到调度器初始化信息"
echo ""

echo "5. 或者测试开发模式："
echo "   a) 启动开发服务器：npm run dev"
echo "   b) 查看日志，应该看到调度器初始化信息"
echo ""
