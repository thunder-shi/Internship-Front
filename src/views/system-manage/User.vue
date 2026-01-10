<template>
  <BaseTreeList
    ref="baseTreeList"
    :default-props="defaultProps"
    @append-click="appendClick"
    @edit-click="editClick"
    @set-type="handleSetType"
  >
    <template #dlg>
      <DlgUserInfo
        ref="dlgUser"
        @update-record="initDataList"
        :props-info="defaultProps.otherInfo"
      />
    </template>
  </BaseTreeList>
</template>
<script setup>
import { reactive, ref } from 'vue';
import BaseTreeList from '@/views/master-page/BaseTreeList.vue';
import DlgUserInfo from '@/views/dialogs/DlgUserInfo.vue';

defineOptions({
  name: 'User',
});

const baseTreeList = ref(null);
const dlgUser = ref(null);

const defaultProps = reactive({
  treeRelColName: 'departmentId',
  defaultDTLProps: {
    title: { mainTitle: '人员列表' },
    someFlags: {
      noAdvancedSearch: false,
    },
    searchItems: [
      { name: '姓名', field: 'name', type: 'input' },
      { name: '手机号', field: 'phone', type: 'input' },
    ],
    defaultDTHProps: {
      keyWord: { edit: 'BaseUser', view: 'ViewBaseUser' },
      allTableColumns: {},
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: false }, search: { show: true }, batchCreate: { show: true } },
    },
  },
  defaultDTProps: {
    keyWord: 'BaseDepartment',
    title: { mainTitle: '单位部门列表' },
  },
  defaultDBIProps: {
    keyWords: 'BaseUser',
  },
  otherInfo: {
    majorId: 0,
    type: null,
  },
});

const allTableColumns = defaultProps.defaultDTLProps.defaultDTHProps.allTableColumns;
Object.assign(allTableColumns, [
  { id: 1, showName: '单位', theOrder: 1, tableColumnName: 'departmentName' },
  { id: 2, showName: '姓名', theOrder: 2, tableColumnName: 'name', sortable: true },
  { id: 3, showName: '职务', theOrder: 3, tableColumnName: 'jobName' },
  { id: 4, showName: '手机号', theOrder: 4, tableColumnName: 'phone', sortable: true },
]);

const form = reactive({ id: null, workId: null, name: '' });

const initDataList = async () => {
  await baseTreeList.value?.initDataList();
};

const appendClick = () => {
  defaultProps.otherInfo.type = 'append';
  dlgUser.value?.showDialog(true, {});
};

const editClick = (val) => {
  defaultProps.otherInfo.type = 'edit';
  Object.assign(form, val);
  console.log(form, '++++++++++++++');
  dlgUser.value?.showDialog(true, form);
};

const handleSetType = async (val) => {
  defaultProps.otherInfo.majorId = val.majorId;
};
</script>
