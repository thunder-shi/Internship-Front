import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import fileAPI from '@/api/file'
import listAPI from '@/api/list'

// Docker / 网关：默认与入口 Nginx 的 /kkfileview 前缀一致（见工作区 server_directory/docker-compose 与 gateway.conf）
// 构建时可设 VITE_KKFILEVIEW_BASE（如 https://preview.example.com/kkfileview）；留空则用当前站点同源路径
function getKkFileViewBase() {
  const fromEnv = import.meta.env.VITE_KKFILEVIEW_BASE
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/kkfileview`.replace(/\/$/, '')
  }
  return ''
}


/**
 * 日志附件管理 composable
 * 供 DlgSubmitDiary（编辑）和 DlgReviewDiary（批阅）共用
 * @param {string} [tableName] 关联业务表名（默认 'main_diary'；自主实习等其他场景传 'RelStuInternshipPost' 等）
 */
export function useDiaryFiles(tableName = 'main_diary') {
  const files = ref([])
  const filesLoading = ref(false)

  async function loadFiles(diaryId) {
    if (!diaryId) { files.value = []; return }
    try {
      filesLoading.value = true
      const res = await listAPI.getSomeRecords({
        keyWords: 'SysOssFile',
        searchKey: { relationIds: diaryId, tableName },
        reg: { relationIds: '=', tableName: '=' },
      })
      files.value = (res?.data?.content || res?.data || []).map(f => ({
        id: f.id,
        name: f.fileName || '未知文件',
        size: Number(f.fileSize) || 0,
      }))
    } catch {
      files.value = []
    } finally {
      filesLoading.value = false
    }
  }

  async function triggerDownload(file) {
    try {
      await fileAPI.downloadFile(file.id)
    } catch {
      ElMessage.error('下载失败')
    }
  }

  /**
   * 通过 kkFileView 在线预览文件
   * presigned URL 需能被 kkFileView 容器访问（Docker 内一般为 http://minio:9000/...）
   */
  async function triggerPreview(file) {
    try {
      const minioUrl = await fileAPI.getPreviewUrl(file.id)
      const kkFileViewBase = getKkFileViewBase()
      if (!kkFileViewBase) {
        ElMessage.error('未配置预览服务地址')
        return
      }
      // base64 结果必须再做一次 encodeURIComponent，否则其中的 + / = 会被 URL 解析破坏
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(minioUrl))))
      window.open(`${kkFileViewBase}/onlinePreview?url=${encoded}`, '_blank')
    } catch {
      ElMessage.error('预览失败，请尝试下载后查看')
    }
  }

  async function deleteFile(file) {
    try {
      await ElMessageBox.confirm('删除后不可恢复，确定删除该文件吗？', '提示', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
      })
    } catch { return }
    try {
      await fileAPI.deleteFile([file.id])
      files.value = files.value.filter(f => f.id !== file.id)
      ElMessage.success('删除成功')
    } catch {
      ElMessage.error('删除失败')
    }
  }

  function reset() {
    files.value = []
  }

  return { files, filesLoading, loadFiles, triggerDownload, triggerPreview, deleteFile, reset }
}
