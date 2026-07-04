# /frontend-test

使用 Playwright 以 Headless 模式测试前端页面功能。

## 使用方式

```
/frontend-test <测试目标描述>
```

示例：`/frontend-test 测试登录页面的表单验证和登录流程`

## 环境要求

- macOS 环境
- 开发服务器运行中（`npm run dev`，默认 http://localhost:5173）
- Playwright 已安装（如未安装会自动安装）

## 执行步骤

1. **确认开发服务器状态**：检查 `http://localhost:5173` 是否可访问。如未启动，提醒用户运行 `npm run dev`。

2. **确认 Playwright 可用**：

```bash
# 检查是否已安装
npx playwright --version 2>/dev/null || npm install -D @playwright/test && npx playwright install chromium
```

3. **编写测试脚本**：在项目根目录创建临时测试文件 `test-temp.spec.js`：

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 监听控制台输出
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]`, msg.text()));
  // 监听网络请求错误
  page.on('requestfailed', req => console.log(`[REQUEST FAILED]`, req.url(), req.failure()?.errorText));

  try {
    // {{ 根据测试目标编写具体测试逻辑 }}
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 截图用于验证
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('[TEST] 测试完成');
  } catch (error) {
    console.error('[TEST ERROR]', error.message);
    await page.screenshot({ path: 'test-error-screenshot.png' });
  } finally {
    await browser.close();
  }
})();
```

4. **运行测试**：

```bash
node test-temp.spec.js
```

5. **查看结果**：读取控制台输出和截图，分析测试结果。

6. **清理**：删除临时测试文件和截图。

```bash
rm -f test-temp.spec.js test-screenshot.png test-error-screenshot.png
```

## 常见测试场景

### 登录流程

```javascript
await page.goto('http://localhost:5173/Login');
await page.fill('input[placeholder*="用户名"]', 'admin');
await page.fill('input[placeholder*="密码"]', 'password');
await page.click('button[type="submit"]');
await page.waitForURL('**/Homepage', { timeout: 5000 });
console.log('[TEST] 登录成功，已跳转到首页');
```

### 表格数据加载

```javascript
await page.goto('http://localhost:5173/#/some-page');
await page.waitForSelector('.el-table__body-wrapper tr', { timeout: 10000 });
const rowCount = await page.locator('.el-table__body-wrapper tr').count();
console.log(`[TEST] 表格加载了 ${rowCount} 行数据`);
```

### 表单验证

```javascript
// 直接点提交，触发验证
await page.click('button:has-text("确定")');
await page.waitForSelector('.el-form-item__error', { timeout: 3000 });
const errors = await page.locator('.el-form-item__error').allTextContents();
console.log('[TEST] 验证错误:', errors);
```

## 仅预览页面

如果只需打开浏览器预览（不需要自动化测试）：

```bash
open -a "Google Chrome" http://localhost:5173
```

## 注意事项

- 始终使用 Headless 模式运行（`headless: true`）
- 通过 `console.log` 输出测试结果，不要使用 `alert`
- 测试完成后清理临时文件
- 需要登录态的页面先模拟登录流程
- Element Plus 组件选择器参考：`.el-table`, `.el-form`, `.el-dialog`, `.el-button` 等
