
<template>
  <BaseList 
  ref = "baseListRef" 
  :default-props="defaultProps" 
  @edit-click="handleEditClick" 
  @confirm-click="onConfirmClick" />
</template>

<script setup>
import { reactive, onMounted ,ref} from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'MainInternshipPost',
});

const baseListRef = ref(null)

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
        {id: 1,showName:'岗位名称',theOrder: 1, tableColumnName: 'name', sortable:true},
        {
          id: 2,
          showName: '岗位类型',
          theOrder: 2,
          tableColumnName: 'basePostTypeName',
          sortable: true,
        },
        { id: 3, showName: '岗位人数', theOrder: 3, tableColumnName: 'allPersonNum', sortable: true },
        { id: 4, showName: '已选人数', theOrder: 4, tableColumnName: 'nowPersonNum', sortable: true },
        { id: 5, showName: '实习项目', theOrder: 5, tableColumnName: 'mainInternshipName', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'MainInternshipPost',
    formItems: [
      {
        name:'岗位名称',
        field: 'name',
        type: 'input'
      },
      {
        name: '岗位类型',
        field: 'basePostTypeId',
        type: 'select',
        keyWords: 'BasePostType',
      },
      { name: '岗位人数', field: 'allPersonNum', type: 'input' },
      { name: '实习项目', field: 'mainInternshipId', type: 'select',  keyWords: 'MainInternship'},
    ],
    formRules: {
      name: [{ required: true, message: '岗位名称不能为空',trigger:'blur'}],
      basePostTypeId: [{ required: true, message: '岗位类型不能为空', trigger: 'blur' }],
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
      mainInternshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'MainInternshipPost',
  },
});

function handleEditClick(row) {
  baseListRef.value.openDlg('edit', row);
}

function onConfirmClick(form){
  form.nowPersonNum = 0
}

</script>