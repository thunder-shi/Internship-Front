<template>
  <div>
    <DataTableList ref="dataTableList" :default-props="defaultProps.defaultDTLProps" @open-dlg="openDlg"  @append-click="appendClick" @edit-click="editClick" @update-column="updateColumn" @delete-click="deleteClick" @audit-click="auditClick" @export-click="exportClick" @more1-click="more1Click" @more2-click="more2Click" @after-init-data="afterInitData" @view-click="viewClick" @self-init="selfInit" @batch-create="batchCreate" @selectedColumnsChange="selectedColumnsChange" @send-click="sendClick" @input="onInput">
      <!--数据操作按钮类 -->
      <template slot="searchPanel">
        <slot name="searchPanel" />
      </template>
      <template slot="left">
        <slot name="left" />
      </template>
      <template slot="moreTopButtons">
        <slot name="moreTopButtons" />
      </template>
      <template slot="topOperate">
        <slot name="topOperate" />
      </template>
      <template #1006name="{ row }">
        <slot name="1006name" :row="row" />
      </template>
      <template v-for="item in defaultProps.nameList" :slot="item" slot-scope="{ row }">
        <slot :name="item" :row="row" />
      </template>
      <template #commitStatus="{ row }">
        <slot name="commitStatus" :row="row" />
      </template>
      <template #commitTime="{ row }">
        <slot name="commitTime" :row="row" />
      </template>
      <template #rightOperate="{ row }">
        <slot name="rightOperate" :row="row" />
      </template>
      <template #rightbtn>
        <slot name="rightbtn" />
      </template>
      <template #topAlert>
        <slot name="header" />
      </template>
    </DataTableList>
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog ref="simpleDialog" :default-props="defaultProps.defaultSDProps" :simpledialog-confirm="confirm" :simpledialog-spec-confirm="specConfirm" @update-record="initDataList" @submit-more="submitMore" @simple-select-change="SimpleSelectChange">
        <template #otherItems>
          <slot name="otherItems" />
        </template>
        <template #bottomItems>
          <slot name="bottomItems" />
        </template>
        <template #upItems>
          <slot name="upItems" />
        </template>
        <template #otherBtn>
          <slot name="otherBtn" />
        </template>
      </SimpleDialog>
    </slot>
    <slot name="batch">
      <!-- 批量录入窗口 -->
      <DlgBatchImport ref="batchAppendDlg" :default-props="defaultProps.defaultDBIProps" @selfImport="selfImport" />
    </slot>
    <slot name="view">
      <DlgView v-if="defaultProps.defaultSDProps && defaultProps.defaultSDProps.viewFormItems" ref="viewDialog" :form-items="defaultProps.defaultSDProps.viewFormItems">

        <template #other>
          <slot name="other" />
        </template>
      </DlgView>
    </slot>
  </div>
</template>

<script>
import DataTableList from '@/components/DataTableList'
import SimpleDialog from '@/components/SimpleDialog'
import DlgBatchImport from '@/views/dialogs/DlgBatchImport'
import { resetForm } from '@/utils/common'
import DlgView from './components/DlgView'
export default {
  name: 'BaseList',
  components: { DataTableList, SimpleDialog, DlgBatchImport, DlgView },
  props: {
    defaultProps: {
      type: Object,
      default: () => {
        return {
          keyWord: { },
          defaultDTLProps: {
            title: {},
            someFlags: {
              operateShow: true, // 最右边的按钮操作面板是否出现
              checkFlag: true, // 是否出现最左边的checkBox
              showPage: true, // 是否显示底部翻页
              autoInit: true, // 初始时是否显示数据
              hasOwnGet: false, // 是否有自己的getSomeRecords方法
              orderList: false // 是否使用1,2,3...方式排序
            },
            initSearchWords: { // 初始时查询的三个关键词
              searchKey: { },
              regKey: { },
              andor: { }
            },
            nowSearchWords: { // 变化查询的三个关键词
              searchKey: { },
              regKey: { },
              andor: { }
            },
            defaultDTHProps: {
              allTableColumns: { },
              buttonProps: { }
            }
          },
          defaultSDProps: {
            isAudit: false
            // defaultDBProps: {
            //   footButtons: { }
            // }
          }
        }
      }
    },
    baselistSpecConfirm: { type: Function, default: null },
    baselistConfirm: { type: Function, default: null },
    searchPlaceholder: { type: String, default: '请输入名称' }
  },
  data() {
    return {
      defaultDTLProps: {},
      defaultSDProps: {
        // form: {},
        // keyWord: '',
        //  isAudit: false,
        defaultDBProps: {
        }
      },
      form: {}, // this.defaultSDProps.form,  //关联form
      keyWord: { edit: '', view: '' }, // this.defaultProps.keyWord,
      sortStr: this.sortString,
      viewDialog: { title: '查看', option: 'view', show: false },
      importDialog: { title: '批量添加', option: 'batch', show: false },
      treeInfo: {},
      searchName: '',
      thisEvents: ''
    }
  },
  computed: {

  },
  watch: {
    // defaultProps: {
    //   handler(val) {
    //     if (val.hasOwnProperty('defaultDTLProps')) {
    //       this.defaultDTLProps = _.merge(this.defaultDTLProps, this.defaultProps.defaultDTLProps)
    //     }
    //     if  (val.hasOwnProperty('defaultSDProps')) {
    //       this.defaultSDProps = _.merge(this.defaultSDProps, this.defaultProps.defaultSDProps)
    //     }
    //   },
    //   deep: true,
    //   immediate: true
    // }
  },
  created() {
    // if (this.defaultProps.hasOwnProperty('defaultSDProps')) {
    //   this.dialog = this.defaultProps.defaultSDProps.defaultDBProps.dialog //关联dialog
    // }
  },
  mounted() {
    this.thisEvents = JSON.parse(JSON.stringify(this._events))
  },
  methods: {
    selfImport(val) {
      console.log(val)
    },
    selectedColumnsChange(val) {
      this.$emit('selectedColumnsChange', val)
    },
    selfInit(val, val2, searchWords) {
      this.$emit('self-init', val, val2, searchWords)
    },
    async initDataList() {
      this.$refs.dataTableList.initDataList()
    },
    // 当前行的改变
    updateColumn(val) {
      this.$emit('update-column', val)
    },
    viewClick(val) {
      if (Object.prototype.hasOwnProperty.call(this.thisEvents, 'view-click')) {
        this.$emit('view-click', val)
      } else {
        this.$refs.viewDialog.showDialog(true, val)
      }
    },
    afterInitData(dataList) {
      this.$emit('after-init-data', dataList)
    },
    // #region  DataList对应按钮事件
    searchClick() {
      // this.regKey = { name: '≈' }
      // this.searchKey = { name: this.searchName }
      // // 父子组件传递数据不及时的问题
      // setTimeout(() => { initDataList() }, 500)
    },
    async appendClick() {
      if (Object.prototype.hasOwnProperty.call(this.thisEvents, 'append-click')) {
        this.$emit('append-click')
      } else {
        Object.assign(this.form, resetForm(this.form))
        this.$refs.simpleDialog.showDialog(true, this.form)
      }
    },
    async editClick(row) {
      if (!Object.prototype.hasOwnProperty.call(this.thisEvents, 'edit-click')) {
        this.openDlg('edit', row)
      } else {
        this.$emit('edit-click', row)
      }
    },
    async deleteClick(row) {
      if (Object.prototype.hasOwnProperty.call(this.thisEvents, 'delete-click')) {
        this.$emit('delete-click', row)
      } else {
        this.$refs.dataTableList._deleteClick(row)
      }
    },
    async auditClick(row, operName) {
      if (Object.prototype.hasOwnProperty.call(this.thisEvents, 'audit-click')) {
        this.$emit('audit-click', row, operName)
      } else {
        this.$refs.dataTableList._audit(row, operName)
      }
    },
    // 导出按钮
    async _exportClick() {
      await this.$refs.dataTableList._exportClick()
    },
    batchCreate() {
      this.$refs.batchAppendDlg.showDialog(true, this.form)
    },
    async exportClick() {
      if (Object.prototype.hasOwnProperty.call(this.thisEvents, 'export-click')) {
        this.$emit('export-click')
      } else {
        await this._exportClick()
      }
    },
    // 更多内容1
    async more1Click(row) {
      this.$emit('more1-click', row)
    },
    // 更多内容2
    async more2Click(row) {
      this.$emit('more2-click', row)
    },
    // 更多内容2
    async sendClick(row) {
      this.$emit('send-click', row)
    },
    onInput(val) {
      this.$emit('input', val)
    },
    // #endregion

    // #region simpleDialog对应的按钮事件
    async confirm(option, type, form) {
      if (!(this.baselistConfirm && typeof this.baselistConfirm === 'function')) {
        await this.$refs.simpleDialog._confirm(option, type)
      } else {
        await this.baselistConfirm(option, type, form)
      }
    },
    async specConfirm(option, type, form) {
      if (!(this.baselistSpecConfirm && typeof this.baselistSpecConfirm === 'function')) {
        await this.$refs.simpleDialog.$refs.dlgBasic._onConfirm(option, type)
      } else {
        await this.baselistSpecConfirm(option, type, form)
      }
    },
    submitMore(row) {
      this.$emit('submit-more', row)
    },
    openDlg(option, row) {
      if (row != null) {
        this.form = { ...row }
      } else {
        this.form = resetForm(this.form)
      }
      // if (option == null) {
      //   option = this.dialog.option
      // }
      if (option === 'edit') {
        // this.dialog = { title: '编辑', option: 'edit', show: true }
        // Object.assign(this.dialog, { title: '编辑', option: 'edit' })
      } else if (option === 'audit') {
        // Object.assign(this.dialog, { title: '审核', option: 'audit' })
      } else if (option === 'append') {
        // Object.assign(this.dialog, { title: '新增', option: 'append' })
      }
      this.$refs.simpleDialog.showDialog(true, this.form)
    },
    SimpleSelectChange(val, field, form, options) {
      this.$emit('simple-select-change', val, field, form, options)
    },
    showDialog(val, data) {
      this.$refs.simpleDialog.showDialog(val, data)
    }
  }
  // #endregion
}
</script>

