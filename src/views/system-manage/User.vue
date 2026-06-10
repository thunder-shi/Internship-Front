<template>
  <BaseTreeList ref="baseTreeList" :default-props="defaultProps" @append-click="appendClick" @edit-click="editClick" @set-type="handleSetType">
    <template #dlg>
      <DlgUserInfo ref="dlgUser" @update-record="initDataList" :props-info="defaultProps.otherInfo" />
    </template>
  </BaseTreeList>
</template>
<script setup>
import { reactive, ref, onMounted } from 'vue';
import BaseTreeList from '@/views/master-page/BaseTreeList.vue';
import DlgUserInfo from '@/views/dialogs/DlgUserInfo.vue';
import treeAPI from '@/api/tree';
import listAPI from '@/api/list.js';

defineOptions({
  name: 'User',
});

const baseTreeList = ref(null);
const dlgUser = ref(null);

/** 与 DlgUserInfo 新增表单一致：BaseMajor + cascader（SimpleTreeSelect 同源树数据） */
const majorSearchItem = reactive({
  name: '专业',
  field: 'majorId',
  type: 'cascader',
  keyWords: 'BaseMajor',
  placeholder: '请选择专业',
  options: [],
  checkStrictly: true,
});

const currentYear = new Date().getFullYear();
const enrollmentYearOptions = [];
for (let y = currentYear + 2; y >= currentYear - 30; y -= 1) {
  const ys = String(y);
  enrollmentYearOptions.push({ id: ys, name: ys });
}

const enrollmentYearSearchItem = reactive({
  name: '入学年',
  field: 'startYear',
  type: 'select',
  placeholder: '请选择入学年',
  options: enrollmentYearOptions,
});

const schoolLengthSearchItem = reactive({
  name: '学制',
  field: 'schoolLength',
  type: 'select',
  placeholder: '请选择学制',
  options: [
    { id: '2', name: '2年' },
    { id: '3', name: '3年' },
    { id: '4', name: '4年' },
    { id: '5', name: '5年' },
    { id: '6', name: '6年' },
    { id: '7', name: '7年' },
    { id: '8', name: '8年' },
  ],
});

/** 与 DlgUserInfo 职务字段一致：jobId + BaseJobPosition */
const jobPositionSearchItem = reactive({
  name: '职务',
  field: 'jobId',
  type: 'select',
  placeholder: '请选择职务',
  options: [],
});

const defaultProps = reactive({
  treeRelColName: 'departmentId',
  defaultDTLProps: {
    title: { mainTitle: '人员列表' },
    someFlags: {
      noAdvancedSearch: false,
      autoInit: false,
    },
    searchItems: [
      { name: '姓名', field: 'name', type: 'input' },
      { name: '手机号', field: 'phone', type: 'input' },
      jobPositionSearchItem,
      majorSearchItem,
      enrollmentYearSearchItem,
      schoolLengthSearchItem,
    ],
    defaultDTHProps: {
      keyWord: { edit: 'BaseUser', view: 'ViewBaseUser' },
      allTableColumns: {},
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: false },
        search: { show: true },
        batchCreate: { show: true },
      },
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
  { id: 5, showName: '学制', theOrder: 5, tableColumnName: 'schoolLength', sortable: true },
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
  dlgUser.value?.showDialog(true, form);
};

const handleSetType = async (val) => {
  defaultProps.otherInfo.majorId = val.majorId;
};

onMounted(async () => {
  try {
    const [majorRes, jobRes] = await Promise.all([
      treeAPI.getAllNodes({
        keyWords: 'BaseMajor',
        virtualRootFlag: false,
        searchKey: {},
        regKey: {},
        lazy: false,
      }),
      listAPI.getSomeRecords({
        keyWords: 'BaseJobPosition',
        pageInfo: { page: 1, size: 5000 },
        sort: { properties: 'id', direction: 'ASC' },
      }),
    ]);
    majorSearchItem.options = majorRes?.data || [];
    jobPositionSearchItem.options = jobRes?.data?.content || [];
  } catch (e) {
    console.error('加载查询条件下拉数据失败', e);
  }
});
</script>
