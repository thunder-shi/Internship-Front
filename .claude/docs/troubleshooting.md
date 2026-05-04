# 问题排查

## 常见问题

**Q: 页面刷新后丢失登录状态？**
检查 `vuex-persistedstate` 配置，确保 user 模块已持久化到 localStorage。

**Q: 表格数据不刷新？**
调用 `baseList.value?.initDataList()`。

**Q: 下拉选择无数据？**
确认 keyWords 参数对应后端表名；查看 Network 请求是否成功。

**Q: 路由跳转没反应？**
检查 `router/index.js` 是否注册该路由；查看 `permission.js` 路由守卫是否拦截。

**Q: 表格自适应高度不生效？**
确保使用 `v-adaptive="{ bottomOffset: 50 }"`；确认表格外层容器有固定高度。

**Q: 审核流程显示异常？**
- 确认查询视图是 Merge View（含 `isAllVerified`、`currentRoleName`）
- `verifyUserId` 用 `isUserIdInVerifyUserId()` 精确匹配，不用 `includes`
- 审核页面用 `useVerifyFilter` composable 的 `clientFilterFn` 过滤

**Q: 文件上传后数据库无关联记录？**
上传顺序错误。必须先 `editOneNode` 获取 `relId`，再 `handleUpload(userId, relId, type)`。

**Q: 文件下载慢或无反应？**
用 `fileAPI.downloadFile(id)` → presigned URL → `window.open`。不要用 `/api/common/minio/file/{id}` 代理路径（经 Vite→后端→Minio 多次转发，慢）。若文件名不对，检查后端 presigned URL 是否携带 `response-content-disposition`。

**Q: Dialog 内文件选择按钮无反应？**
`el-upload` 在 Element Plus 2.x 的 `el-dialog` 内点击无反应。改用：
```html
<input type="file" ref="fileInputRef" style="display:none" @change="handleFileChange">
<el-button @click="fileInputRef.click()">选择文件</el-button>
```

**Q: RSA 加密失败？**
检查 keyWord 参数是否正确传递（`utils/rsaEncrypt.js`）。

**Q: 对话框无法拖拽？**
确保使用了 `v-dialogDrag` 指令（定义在 `utils/forDialog.js`）。
