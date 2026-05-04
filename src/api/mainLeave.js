import request from '@/utils/request';

export function saveLeave(node) {
  return request({
    url: '/common/saveOneRecord?tblName=MainLeave',
    method: 'put',
    data: node,
  });
}

export function submitLeaveAudit(leaveId) {
  return request({
    url: '/main-leave/submit-audit',
    method: 'post',
    data: {
      node: {
        leaveId: Number(leaveId),
      },
    },
  });
}

export function getMainLeavePage(node) {
  return request({
    url: '/common/getSomeRecords/MainLeave',
    method: 'post',
    data: node,
  });
}

export function getLeaveUniversalDetailsPage(node) {
  return request({
    url: '/common/getSomeRecords/ViewLeaveUniversalDetails',
    method: 'post',
    data: node,
  });
}

export function getLeaveAuditFlowPage(node) {
  return request({
    url: '/common/getSomeRecords/ViewLeaveAuditFlow',
    method: 'post',
    data: node,
  });
}

export function getAuditorTodoPage(node) {
  return request({
    url: '/common/getSomeRecords/ViewAuditorTodoList',
    method: 'post',
    data: node,
  });
}

export function deleteLeave(id) {
  return request({
    url: `/common/deleteRecordByDelflag?tblName=MainLeave&id=${id}`,
    method: 'delete',
  });
}

const mainLeaveAPI = {
  saveLeave,
  submitLeaveAudit,
  getMainLeavePage,
  getLeaveUniversalDetailsPage,
  getLeaveAuditFlowPage,
  getAuditorTodoPage,
  deleteLeave,
};

export default mainLeaveAPI;

