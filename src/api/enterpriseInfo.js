import request from '@/utils/request';
import { safeStringify } from '@/utils/common';

function postNode(url, node = {}) {
  return request({
    url,
    method: 'post',
    data: {
      node: safeStringify(node),
    },
  });
}

function mine() {
  /** 含 currentApproved：后端按 resolveEffectiveApprovedRecord 解析「当前有效通过版」 */
  return request({
    url: '/enterpriseInfo/mine',
    method: 'post',
    data: {},
  });
}

function history(node = {}) {
  /** searchKey 可与 keyword、createUserId 等并列传 onlyEffectiveCurrent: true（仅 effectiveCurrent 为真的行） */
  return postNode('/enterpriseInfo/history', node);
}

function detail(node = {}) {
  return postNode('/enterpriseInfo/detail', node);
}

function saveDraft(node = {}) {
  return postNode('/enterpriseInfo/saveDraft', node);
}

function submit(node = {}) {
  return postNode('/enterpriseInfo/submit', node);
}

function resubmit(node = {}) {
  return postNode('/enterpriseInfo/resubmit', node);
}

function auditList(node = {}) {
  /** searchKey 可与 keyword、auditStatus、onlyMine 并列传 onlyEffectiveCurrent: true */
  return postNode('/enterpriseInfo/audit/list', node);
}

function auditDetail(node = {}) {
  return postNode('/enterpriseInfo/audit/detail', node);
}

function auditProcess(node = {}) {
  return postNode('/enterpriseInfo/audit/process', node);
}

function getVerifyConfig() {
  return request({
    url: '/enterpriseInfo/verifyConfig/get',
    method: 'post',
    data: {},
  });
}

function saveVerifyConfig(node = {}) {
  return postNode('/enterpriseInfo/verifyConfig/save', node);
}

export default {
  mine,
  history,
  detail,
  saveDraft,
  submit,
  resubmit,
  auditList,
  auditDetail,
  auditProcess,
  getVerifyConfig,
  saveVerifyConfig,
};
