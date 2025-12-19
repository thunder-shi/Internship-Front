import request from '@/utils/request'

// 获取角色权限
function getRolePermissions(roleId) {
  return request({
    url: '/role/getRolePermissions',
    method: 'post',
    data: { roleId }
  })
}

// 编辑角色权限
function editRolePermission(roleId, permissions) {
  return request({
    url: '/role/editRolePermissions',
    method: 'post',
    data: { roleId, permissions }
  })
}

export default {
  getRolePermissions,
  editRolePermission
}
