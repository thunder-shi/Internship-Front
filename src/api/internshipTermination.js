import request from '@/utils/request';

function postNode(url, node = {}) {
  return request({
    url,
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

function listCandidates(node) {
  return postNode('/internshipTermination/listCandidates', node);
}

function create(node) {
  return postNode('/internshipTermination/create', node);
}

function audit(node) {
  return postNode('/internshipTermination/audit', node);
}

function detail(node) {
  return postNode('/internshipTermination/detail', node);
}

function cancel(node) {
  return postNode('/internshipTermination/cancel', node);
}

export default {
  listCandidates,
  create,
  audit,
  detail,
  cancel,
};
