import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import fileAPI from '@/api/file'
import listAPI from '@/api/list'

// kkFileView 与 MinIO 部署在同一台服务器，端口固定 8012
// 运行时从 presigned URL 里提取 hostname，无需手动配置 IP
const KKFILEVIEW_PORT = 8012


/**
 * 日志附件管理 composable
 * 供 DlgSubmitDiary（编辑）和 DlgReviewDiary（批阅）共用
 */
export function useDiaryFiles() {
  const files = ref([])
  const filesLoading = ref(false)

  async function loadFiles(diaryId) {
    if (!diaryId) { files.value = []; return }
    try {
      filesLoading.value = true
      const res = await listAPI.getSomeRecords({
        keyWords: 'SysOssFile',
        searchKey: { relationIds: diaryId, tableName: 'main_diary' },
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
   * 从 MinIO presigned URL 中提取 hostname，kkFileView 与 MinIO 在同一台服务器
   */
  async function triggerPreview(file) {
    try {
      const minioUrl = await fileAPI.getPreviewUrl(file.id)
      const { hostname } = new URL(minioUrl)
      const kkFileViewBase = `http://${hostname}:${KKFILEVIEW_PORT}`
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
