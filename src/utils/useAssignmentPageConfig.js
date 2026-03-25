/**
 * 实习安排/审核页面公共配置 composable
 * 供 StudentAssignment、TeacherAssignment、StudentAssignmentVerify、TeacherAssignmentVerify 使用
 */
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import moment from 'moment';
import CONSTANT from '@/utils/constant';

/**
 * @param {Object} options
 * @param {string} options.processTypeCode - CONSTANT.PROCESS_TYPE.STUDENT_SELECT_INTERNSHIP | TEACHER_SELECT_INTERNALSHIP
 * @param {string} options.mainTitle - 页面主标题，如 '学生实习项目安排'
 * @param {boolean} [options.withMajorFilter=true] - 是否按专业过滤项目（安排页 true，审核页 false）
 */
export function useAssignmentPageConfig(options) {
  const {
    processTypeCode,
    mainTitle,
    withMajorFilter = true,
    /** 列表 nowSearchWords 中与流程关联的业务表名（默认师生安排表） */
    assignmentTableName = 'RelIntershipUser',
  } = options;

  const store = useStore();
  const headerPageRef = ref(null);

  const roles = computed(() => store.getters.roles || []);
  const isCompanyUser = computed(() =>
    roles.value.some(
      (r) =>
        r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
    )
  );
  const userInfo = computed(() => store.getters.userInfo || {});

  const titleObj = reactive({ mainTitle });

  const isMore1Disabled = computed(
    () => headerPageRef.value?.isMore1Disabled?.value ?? false
  );

  const projectSelectSearchKey = computed(() => {
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const searchKey = {
      processTypeCode,
      startTime: currentTime,
      endTime: currentTime,
    };
    if (withMajorFilter && userInfo.value?.majorId) {
      searchKey.majorIds = userInfo.value.majorId;
    }
    return searchKey;
  });

  const projectSelectRegKey = computed(() => {
    const regKey = {
      startTime: CONSTANT.SEARCH_OPERATOR.LE,
      endTime: CONSTANT.SEARCH_OPERATOR.GE,
    };
    if (withMajorFilter && userInfo.value?.majorId) {
      regKey.majorIds = 'fi()';
    }
    return regKey;
  });

  function buildSearchKey(baseSearchKey) {
    return {
      processTypeCode,
      internshipId: baseSearchKey.internshipId,
      tableName: assignmentTableName,
    };
  }

  function handleProjectSelected(_internship, title) {
    if (title) titleObj.mainTitle = title;
  }

  return {
    headerPageRef,
    roles,
    isCompanyUser,
    userInfo,
    titleObj,
    isMore1Disabled,
    processTypeCode,
    projectSelectSearchKey,
    projectSelectRegKey,
    buildSearchKey,
    handleProjectSelected,
  };
}
