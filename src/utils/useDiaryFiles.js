import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import fileAPI from '@/api/file'
import listAPI from '@/api/list'

const BROWSER_PREVIEW_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
const OFFICE_PREVIEW_EXTS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']

function getKkFileViewBase() {
  const fromEnv = import.meta.env.VITE_KKFILEVIEW_BASE
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '')
  }
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return ''
  }
  const host = window.location.hostname
  // 本机 npm run dev：kkFileView 在开发机 47，不在 localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://47.96.172.199:8012'
  }
  return '/api/kkfileview'
}

function fileExt(file) {
  const name = file?.name || file?.fileName || ''
  const i = name.lastIndexOf('.')
  if (i < 0) return ''
  return name.slice(i + 1).toLowerCase()
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
        url: f.url,
        previewUrl: f.previewUrl,
        downloadUrl: f.downloadUrl,
      }))
    } catch {
      files.value = []
    } finally {
      filesLoading.value = false
    }
  }

  function downloadHref(file) {
    if (file?.downloadUrl) return fileAPI.resolveFileHref(file.downloadUrl)
    if (file?.id == null || file.id === '') return ''
    return fileAPI.getDownloadUrl(file.id)
  }

  function previewHref(file) {
    if (file?.previewUrl) return fileAPI.resolveFileHref(file.previewUrl)
    if (file?.url) return fileAPI.resolveFileHref(file.url)
    if (file?.id == null || file.id === '') return ''
    return fileAPI.getPreviewUrl(file.id)
  }

  async function triggerDownload(file) {
    const href = downloadHref(file)
    if (!href) {
      ElMessage.warning('附件编号缺失，无法下载')
      return
    }
    window.open(href, '_blank')
  }

  async function triggerPreview(file) {
    const ext = fileExt(file)
    if (OFFICE_PREVIEW_EXTS.includes(ext)) {
      if (file?.id == null || file.id === '') {
        ElMessage.warning('附件编号缺失，无法预览')
        return
      }
      const kkFileViewBase = getKkFileViewBase()
      if (!kkFileViewBase) {
        ElMessage.error('未配置预览服务地址')
        return
      }
      try {
        const minioUrl = await fileAPI.getPresignedPreviewUrl(file.id)
        const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(minioUrl))))
        window.open(`${kkFileViewBase}/onlinePreview?url=${encoded}`, '_blank')
      } catch {
        ElMessage.error('预览失败，请尝试下载后查看')
      }
      return
    }

    if (ext && !BROWSER_PREVIEW_EXTS.includes(ext)) {
      ElMessage.warning('该文件类型请下载后查看')
      return
    }

    const href = previewHref(file)
    if (!href) {
      ElMessage.warning('附件编号缺失，无法预览')
      return
    }
    window.open(href, '_blank')
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
