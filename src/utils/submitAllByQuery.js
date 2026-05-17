import { ElMessage, ElMessageBox } from 'element-plus';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';

const DEFAULT_PAGE_INFO = { page: 1, size: 10000 };

/** 无需审核、自动通过时写入 MainVerifyProcess 的附加字段（与行内提交一致） */
const DEFAULT_AUTO_PASS_EXTRA = {
  verifyUserName: '系统',
  reason: '无需审核，系统自动通过',
};

/**
 * 「全部提交」：按条件 getSomeRecords，再 editManyNodes 批量更新。
 *
 * @param {object} submitAll
 * @param {string} submitAll.keyWords 查询视图/表关键字
 * @param {object} [submitAll.searchKey]
 * @param {object} [submitAll.reg]
 * @param {object} [submitAll.pageInfo] 默认 { page:1, size:10000 }
 * @param {object} [submitAll.sort]
 * @param {object} [submitAll.treeInfo]
 * @param {object} [submitAll.andor]
 * @param {(row: object) => boolean} [submitAll.filterRows] 查询结果二次过滤（保持纯函数；行级别取舍用此，整体上限用 maxRows）
 * @param {number} [submitAll.maxRows] 过滤后最多保留的行数（如无审核流程只允许提交 1 条时使用）；confirm 计数与最终提交数都按该上限。
 * @param {string} [submitAll.editKeyWords='MainVerifyProcess'] editManyNodes 的 keyWords
 * @param {string} [submitAll.sendKey='id'] 节点 id 取自行的字段名
 * @param {number} [submitAll.sendAudit=AUDIT_STATUS.SUBMIT] 需审核时的 isAudit（默认 SUBMIT；与 sendAuditField、自动分支互斥）
 * @param {string} [submitAll.sendAuditField] 节点 isAudit 取自行上该字段（与自动分支互斥）
 * @param {boolean} [submitAll.useVerifyTypeAutoBranch=true] 无 mapNode/sendAuditField 时：verifyTypeId 为无需审核则 PASS 并合并 autoPassExtra，否则 isAudit 为 sendAudit
 * @param {object} [submitAll.autoPassExtra] 自动通过行附加字段；默认带 verifyUserName/reason；显式传 {} 则不附加
 * @param {number|string} [submitAll.noVerifyVerifyTypeId] 视为「无需审核」的 verifyTypeId，默认 VERIFY_LEVEL.NO_VERIFY
 * @param {(row: object) => object|undefined} [submitAll.mapNode] 自定义每条节点；返回假值则跳过
 * @param {string} [submitAll.confirmTitle]
 * @param {(count: number) => string} [submitAll.buildConfirmText]
 * @param {() => boolean} [submitAll.guard] 返回 false 时中止（需自行提示）
 * @param {object} [options]
 * @param {(force?: boolean) => void} [options.initDataList] 成功后刷新列表
 */
export async function runSubmitAllByQuery(submitAll, options = {}) {
  const { initDataList } = options;
  if (typeof submitAll.guard === 'function' && submitAll.guard() === false) {
    return;
  }
  const {
    keyWords,
    searchKey = {},
    reg = {},
    pageInfo = DEFAULT_PAGE_INFO,
    sort = { properties: 'id', direction: 'DESC' },
    treeInfo,
    andor,
    filterRows,
    maxRows,
    editKeyWords = 'MainVerifyProcess',
    sendKey = 'id',
    sendAudit = CONSTANT.AUDIT_STATUS.SUBMIT,
    sendAuditField,
    useVerifyTypeAutoBranch = true,
    autoPassExtra: autoPassExtraOpt,
    noVerifyVerifyTypeId = CONSTANT.VERIFY_LEVEL.NO_VERIFY,
    mapNode,
    confirmTitle = '全部提交',
    buildConfirmText = (n) => `确定提交全部 ${n} 条记录吗？`,
  } = submitAll;

  if (!keyWords) {
    ElMessage.warning('submitAll 缺少 keyWords');
    return;
  }

  const res = await listAPI.getSomeRecords({
    keyWords,
    searchKey,
    reg,
    pageInfo,
    sort,
    treeInfo,
    andor,
  });
  let rows = res?.data?.content ?? res?.data ?? [];
  if (!Array.isArray(rows)) rows = [];
  if (typeof filterRows === 'function') {
    rows = rows.filter(filterRows);
  }
  if (Number.isInteger(maxRows) && maxRows >= 0 && rows.length > maxRows) {
    rows = rows.slice(0, maxRows);
  }
  if (!rows.length) {
    ElMessage.info('没有待提交的记录');
    return;
  }

  try {
    await ElMessageBox.confirm(buildConfirmText(rows.length), confirmTitle, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch (e) {
    if (e !== 'cancel') throw e;
    return;
  }

  let nodes;
  if (typeof mapNode === 'function') {
    nodes = rows.map(mapNode).filter(Boolean);
  } else if (sendAuditField) {
    nodes = rows
      .map((row) => {
        const id = row[sendKey];
        const isAudit = row[sendAuditField];
        return { id, isAudit };
      })
      .filter((n) => n.id != null && n.id !== '' && n.isAudit !== undefined && n.isAudit !== null);
  } else if (useVerifyTypeAutoBranch) {
    const passExtra =
      autoPassExtraOpt === undefined ? DEFAULT_AUTO_PASS_EXTRA : autoPassExtraOpt || {};
    nodes = rows
      .map((row) => {
        const id = row[sendKey];
        if (id == null || id === '') return null;
        const isNoVerify = row.verifyTypeId == noVerifyVerifyTypeId;
        if (isNoVerify) {
          return {
            id,
            isAudit: CONSTANT.AUDIT_STATUS.PASS,
            ...passExtra,
          };
        }
        return { id, isAudit: sendAudit };
      })
      .filter(Boolean);
  } else {
    nodes = rows
      .map((row) => {
        const id = row[sendKey];
        return { id, isAudit: sendAudit };
      })
      .filter((n) => n.id != null && n.id !== '');
  }

  if (!nodes.length) {
    ElMessage.warning('没有有效的提交数据');
    return;
  }

  const resInfo = await listAPI.editManyNodes(editKeyWords, nodes);
  if (resInfo?.message === 'successful') {
    ElMessage.success(`全部提交完成，共成功提交 ${nodes.length} 条记录`);
    initDataList?.(true);
  } else {
    ElMessage.warning(resInfo?.message || '批量提交失败');
  }
}
