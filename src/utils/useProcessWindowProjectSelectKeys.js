/**
 * 实习项目下拉：仅展示「当前时刻」落在流程 startTime～endTime 内的项目。
 * 条件与 useAssignmentPageConfig 中 projectSelectSearchKey / projectSelectRegKey 一致，
 * 供直接使用 InternshipPostHeaderPage、但未走 useAssignmentPageConfig 的页面复用。
 */
import { computed } from 'vue';
import moment from 'moment';
import CONSTANT from '@/utils/constant';

/**
 * @param {import('vue').ComputedRef<object>} userInfo
 * @param {boolean} [withMajorFilter=true] - 与实习安排页一致时传 true；审核页等可传 false
 */
export function useProcessWindowProjectSelectKeys(userInfo, withMajorFilter = true) {
  const projectSelectSearchKey = computed(() => {
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const searchKey = {
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

  return { projectSelectSearchKey, projectSelectRegKey };
}
