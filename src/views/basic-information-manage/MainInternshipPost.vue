
<template>
  <BaseList :default-props="defaultProps"  />
</template>
<script setup>
import { reactive, onMounted } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'MainInternshipPost',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
        batchCreate: { show: true },
      },
      keyWord: { edit: 'MainInternshipPost', view: 'ViewMainInternshipPost' },
      allTableColumns: [
        {
          id: 1,
          showName: '岗位类型',
          theOrder: 1,
          tableColumnName: 'basePostTypeName',
          sortable: true,
        },
        { id: 2, showName: '岗位人数', theOrder: 2, tableColumnName: 'allPersonNum', sortable: true },
        { id: 3, showName: '已选人数', theOrder: 3, tableColumnName: 'nowPersonNum', sortable: true },
        { id: 4, showName: '实习项目', theOrder: 4, tableColumnName: 'mainInternshipName', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'MainInternshipPost',
    formItems: [
      {
        name: '岗位类型',
        field: 'postTypeId',
        type: 'select',
        keyWords: 'BasePostType',
      },
      { name: '岗位人数', field: 'allPersonNum', type: 'input' },
      { name: '实习项目', field: 'internshipId', type: 'select',  keyWords: 'MainInternship'},
    ],
    formRules: {
      postTypeId: [{ required: true, message: '岗位类型不能为空', trigger: 'blur' }],
      allPersonNum: [
        { required: true, message: '岗位人数不能为空', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value === '' || value === null || value === undefined) {
              callback();
              return;
            }
            // 确保值是数字类型
            const numValue = typeof value === 'string' ? Number(value) : value;
            if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
              callback(new Error('岗位人数必须是大于0的整数'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ],
      //nowPersonNum: [{ required: true, message: '已选人数不能为空', trigger: 'blur' }],
      internshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'MainInternshipPost',
  },
});


</script>