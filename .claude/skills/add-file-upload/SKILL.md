# /add-file-upload

为表单页面添加 Minio 文件上传功能。

## 使用方式

```
/add-file-upload <页面文件路径> [字段名] [文件类型] [最大大小MB]
```

示例：`/add-file-upload src/views/internship-process/Foo.vue attachments pdf,docx 20`

## 执行步骤

1. **读取目标文件**：理解现有表单结构、`form` 对象字段、保存逻辑。

2. **添加 SimpleUpload 组件**：在表单中插入文件上传区域。

```vue
<el-form-item label="附件">
  <SimpleUpload
    ref="uploadRef"
    v-model="form.fileList"
    :up-button-info="{ name: '上传附件', tooltip: '支持 pdf/docx，不超过20MB' }"
    :file-max-size="20"
    :file-allowed-types="['pdf', 'docx', 'doc']"
    :allow-multi-files="true"
    :update-status="canEdit"
  />
</el-form-item>
```

**props 说明：**

| Prop | 类型 | 说明 |
|------|------|------|
| `v-model` | `Array` | 文件列表（绑定到 form 字段） |
| `up-button-info` | `Object` | `{ name, tooltip }` 按钮文案和提示 |
| `file-max-size` | `Number` | 最大文件大小（MB），默认 20 |
| `file-allowed-types` | `Array` | 允许的扩展名，如 `['pdf', 'docx']`，空数组=不限制 |
| `allow-multi-files` | `Boolean` | 是否允许多文件，默认 true |
| `update-status` | `Boolean` | 控制是否可以上传/删除，审核通过后设 false |

3. **修改 script setup**：添加必要的 import 和 ref。

```javascript
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import SimpleUpload from '@/components/SimpleUpload.vue'
import fileAPI from '@/api/file'

const store = useStore()
const userInfo = computed(() => store.getters.userInfo)
const uploadRef = ref(null)
```

4. **修改保存逻辑**：上传顺序是 **先保存主记录 → 获取 relId → 再上传文件**。

```javascript
const handleSave = async () => {
  // 先保存主记录，提交时排除 fileList 字段
  const { fileList, ...formData } = form.value
  const res = await listAPI.editOneNode('TableName', formData)
  const relId = res.data.id

  // 再上传文件（type: 1=图片, 2=普通文件）
  if (form.value.fileList?.length > 0) {
    await uploadRef.value.handleUpload(userInfo.value.id, relId, 2)
  }
}
```

5. **处理回显**：编辑时从后端加载已有文件列表赋值给 `form.fileList`。

```javascript
// 编辑时回显已上传文件（后端返回的文件对象需包含 id, name, url, size）
const openEdit = (row) => {
  form.value = { ...row }
  // form.value.fileList 应由后端随记录一起返回
}
```

## 注意事项

- `SimpleUpload` **不自动上传**，必须手动调用 `handleUpload(userId, relId, type)`
- `relId` 通常是主记录保存后才有，所以文件上传必须在保存主记录之后
- `type` 值：`1` = 图片，`2` = 普通文件
- 文件删除时组件内部自动调用 `fileAPI.deleteFile` 从 Minio 删除，无需额外处理
- 后端通过 `relId + tabName` 关联文件与业务记录
- `update-status` 为 `false` 时禁止上传和删除，适合审核通过后的只读场景
- 在 `formItems` 配置中也可直接使用 `type: 'uploadFile'`（通过 `FormItemsforDialog` 渲染）：

```javascript
{
  name: '附件',
  field: 'fileList',
  type: 'uploadFile',
  upButtonInfo: { name: '上传附件', tooltip: '不超过20MB' },
  fileMaxSize: 20,
  fileAllowedTypes: ['pdf', 'docx'],
  allowMultiFiles: true
}
```

## API 参考

```javascript
import fileAPI from '@/api/file'

// 上传（内部封装 FormData，files 字段会被自动拆分追加）
fileAPI.upload({ files, userId, relIds, type, tabName })

// 下载（GET /common/minio/download/{id} 获取 presigned URL，再 window.open 直连 Minio）
// 后端生成 presigned URL 时须携带 response-content-disposition 以保留原始文件名
await fileAPI.downloadFile(fileId)

// 删除（支持单个 ID 或 ID 数组）
fileAPI.deleteFile([1, 2, 3])

// 获取当前上传/下载进度（0-100）
fileAPI.getProgressPercent()
```
