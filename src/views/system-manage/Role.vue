<template>
  <div>
    <div class="box-flex">
      <div style="width: 45%">
        <BaseList :default-props="defaultBLProps" @update-column="updateColumn" />
      </div>
      <!-- 列表右侧-->
      <div style="width:53%; ">
        <el-card shadow="never">
          <template #header>
            <span title="选择指定角色分配菜单">角色授权 | <strong>{{ currentColumn?.name || "--" }}</strong></span>
            <el-button :disabled="!currentColumn" :loading="saveLoading"  style="float: right;padding: 6px 9px;margin-top:-5px" type="primary" :title="currentColumn ? '' : '请在左边列表选择一个角色'" @click="saveRoleMenus">保存</el-button>
          </template>
          <el-table ref="dataTree" v-adaptive="{ noPage: true }" v-loading="loading" :data="treeData" height="100%" row-key="id" :expand-row-keys="['-1']">
            <el-table-column prop="name" label="名称" width="150" :show-overflow-tooltip="true" />
            <el-table-column label="查询">
              <template #default="scope">
                <el-checkbox v-model="scope.row.authorizationInfo.visibleFlag" @change="handleSingleChange( scope.row.authorizationInfo, scope, 'visibleFlag' )" />
              </template>
            </el-table-column>
            <el-table-column label="添加">
              <template #default="scope">
                <el-checkbox v-model="scope.row.authorizationInfo.addFlag" @change="handleSingleChange(scope.row.authorizationInfo,scope,'addFlag' )" />
              </template>
            </el-table-column>
            <el-table-column label="修改">
              <template #default="scope">
                <el-checkbox v-model="scope.row.authorizationInfo.modifyFlag" @change="handleSingleChange( scope.row.authorizationInfo, scope, 'modifyFlag' )" />
              </template>
            </el-table-column>
            <el-table-column label="删除">
              <template #default="scope">
                <el-checkbox v-model="scope.row.authorizationInfo.deleteFlag" @change=" handleSingleChange( scope.row.authorizationInfo, scope, 'deleteFlag' )" />
              </template>
            </el-table-column>
            <el-table-column label="全部">
              <template #default="scope">
                <el-checkbox v-model="scope.row.authorizationAllFlag" :indeterminate=" (
                  scope.row.authorizationInfo.visibleFlag | scope.row.authorizationInfo.addFlag ||scope.row.authorizationInfo.modifyFlag || scope.row.authorizationInfo.deleteFlag)
                  && !scope.row.authorizationAllFlag" @change="handleCheckAllChange(scope.row.authorizationInfo, scope.row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import roleAPI from '@/api/role'
import BaseList from '@/views/master-page/BaseList.vue'

// 响应式数据
const defaultBLProps = reactive({
  defaultDTLProps: {
    sortStr: { properties: 'theOrder', direction: 'ASC' }, // 排序方法
    title: { mainTitle: '角色列表' },
    defaultDTHProps: {
      keyWord: { edit: 'SysRole' }
    }
  },
  defaultSDProps: {
    keyWord: 'SysRole',
    defaultDBProps: {
      dialog: {}
    }
  }
})

const treeData = ref([])
const currentColumn = ref(null)
const parentArr = ref([])
const loading = ref(false)
const saveLoading = ref(false)
const dataTree = ref(null)

// 监听 currentColumn.id 的变化
watch(() => currentColumn.value?.id, (val) => {
  if (val) {
    initDataTree()
  }
})

// 初始化数据树
async function initDataTree() {
  if (currentColumn.value?.id) {
    try {
      loading.value = true
      const resp = await roleAPI.getRolePermissions(currentColumn.value.id)
      treeData.value = resp.data
      initAllNodes()
      loading.value = false
    } catch (error) {
      loading.value = false
    }
  }
}

// 初始化所有节点信息
function initAllNodes() {
  if (treeData.value.length > 0) {
    treeData.value[0].authorizationInfo.visibleFlag = true
    treeData.value[0].authorizationInfo.addFlag = true
    treeData.value[0].authorizationInfo.modifyFlag = true
    treeData.value[0].authorizationInfo.deleteFlag = true
    treeData.value[0].authorizationAllFlag = true
    initCallFunc(treeData.value, 'authorizationAllFlag')
    initCallFunc(treeData.value, 'visibleFlag')
    initCallFunc(treeData.value, 'addFlag')
    initCallFunc(treeData.value, 'modifyFlag')
    initCallFunc(treeData.value, 'deleteFlag')
  }
}

// 增删改查的联动
function initCallFunc(val = treeData.value, prop) {
  if (prop === 'authorizationAllFlag') {
    val.forEach(e => {
      if (e[prop] === false) {
        return (treeData.value[0][prop] = false)
      }
      if (e.children && e.children.length) {
        initCallFunc(e.children, prop)
      }
    })
  } else {
    val.forEach(e => {
      if (e.authorizationInfo[prop] === false) {
        return (treeData.value[0].authorizationInfo[prop] = false)
      }
      if (e.children && e.children.length) {
        initCallFunc(e.children, prop)
      }
    })
  }
}

// 回调循环函数
function allCallFunc(val, status) {
  if (val.children && val.children.length > 0) {
    val.children.forEach(e => {
      e.authorizationAllFlag = status
      e.authorizationInfo.visibleFlag = e.authorizationInfo.addFlag = e.authorizationInfo.modifyFlag = e.authorizationInfo.deleteFlag = status
      allCallFunc(e, status)
    })
  }
  const pids = []
  getParentNodes(treeData.value, val.id, pids)
  parentNodesChange(treeData.value, pids, val)
}

// 单个回调函数
function singleCallFunc(val, prop) {
  if (val.children && val.children.length > 0) {
    val.children.forEach(e => {
      prop === 'visibleFlag' ? (e.authorizationInfo.visibleFlag = val.authorizationInfo.visibleFlag) : ''
      prop === 'addFlag' ? (e.authorizationInfo.addFlag = val.authorizationInfo.addFlag) : ''
      prop === 'modifyFlag' ? (e.authorizationInfo.modifyFlag = val.authorizationInfo.modifyFlag) : ''
      prop === 'deleteFlag' ? (e.authorizationInfo.deleteFlag = val.authorizationInfo.deleteFlag) : ''

      // 更新全选-非全选的内容
      e.authorizationAllFlag = false
      if (
        e.authorizationInfo.visibleFlag === true && e.authorizationInfo.addFlag === true &&
        e.authorizationInfo.modifyFlag === true && e.authorizationInfo.deleteFlag === true
      ) {
        e.authorizationAllFlag = true
      } else if (
        val.authorizationInfo.visibleFlag === false && val.authorizationInfo.addFlag === false &&
        val.authorizationInfo.modifyFlag === false && val.authorizationInfo.deleteFlag === false
      ) {
        e.authorizationAllFlag = false
      }
      singleCallFunc(e, prop)
    })
  }
  const pids = []
  getParentNodes(treeData.value, val.id, pids)
  parentNodesChange(treeData.value, pids, val)
}

// 当前行的改变
function updateColumn(val) {
  currentColumn.value = val
}

// 获取每层父节点的节点数组
function getParentNodes(val, id, arr) {
  val.forEach(e => {
    if (e.id === id) {
      if (e.parentId) {
        // 排除顶级虚节点id=-1
        arr.push(e.parentId)
      }
      getParentNodes(treeData.value, e.parentId, arr)
    } else {
      if (e.children && e.children.length) {
        getParentNodes(e.children, id, arr)
      }
    }
  })
}

function parentNodesChange(arr, pids, val) {
  arr.forEach(e => {
    if (pids.indexOf(e.id) > -1) {
      val.authorizationInfo.visibleFlag ? (e.authorizationInfo.visibleFlag = true) : ''
      val.authorizationInfo.addFlag ? (e.authorizationInfo.addFlag = true) : ''
      val.authorizationInfo.modifyFlag ? (e.authorizationInfo.modifyFlag = true) : ''
      val.authorizationInfo.deleteFlag ? (e.authorizationInfo.deleteFlag = true) : ''
      e.authorizationAllFlag = false
      if (
        e.authorizationInfo.visibleFlag === true && e.authorizationInfo.addFlag === true &&
        e.authorizationInfo.modifyFlag === true && e.authorizationInfo.deleteFlag === true
      ) {
        e.authorizationAllFlag = true
      } else if (
        val.authorizationInfo.visibleFlag === false && val.authorizationInfo.addFlag === false &&
        val.authorizationInfo.modifyFlag === false && val.authorizationInfo.deleteFlag === false
      ) {
        e.authorizationAllFlag = false
      }
    }
    if (e.children && e.children.length) {
      parentNodesChange(e.children, pids, val)
    }
  })
}

// 树节点的联动
function parentNodeChange(val) {
  if (val.children && val.children.length) {
    val.children.forEach(child => {
      if (child.authorizationInfo.visibleFlag === true) {
        return (val.authorizationInfo.visibleFlag = true)
      } else {
        parentNodeChange(child)
      }
    })
  }
}

// 全选
function handleCheckAllChange(val, val2) {
  if (val2.authorizationAllFlag) {
    val.visibleFlag = val.addFlag = val.modifyFlag = val.deleteFlag = true
    allCallFunc(val2, true)
  } else {
    val.visibleFlag = val.addFlag = val.modifyFlag = val.deleteFlag = false
    allCallFunc(val2, false)
  }
  if (treeData.value.length > 0) {
    treeData.value[0].authorizationAllFlag = true
    initAllNodes()
  }
}

// 改变单个框的变化
function handleSingleChange(val, val2, prop) {
  val2.row.authorizationAllFlag = false
  if (
    val.visibleFlag === true && val.addFlag === true && val.modifyFlag === true && val.deleteFlag === true
  ) {
    // 使用scope.row直接赋值没有效果
    val2.row.authorizationAllFlag = true
  } else if (
    val.visibleFlag === false && val.addFlag === false && val.modifyFlag === false && val.deleteFlag === false
  ) {
    val2.row.authorizationAllFlag = false
  }

  singleCallFunc(val2.row, prop)
  if (treeData.value.length > 0) {
    treeData.value[0].authorizationAllFlag = true
    initAllNodes()
  }
}

// 保存权限
async function saveRoleMenus() {
  try {
    saveLoading.value = true
    await roleAPI.editRolePermission(currentColumn.value.id, treeData.value[0])
    saveLoading.value = false
    ElMessage.success('保存成功！')
  } catch (error) {
    saveLoading.value = false
  }
}
</script>
<style lang="scss" scoped>
:deep(.el-card__body) {
  padding: 0;
}
.box-flex {
  display: flex;
  justify-content: space-between;
}
</style>
