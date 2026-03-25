/**
 * 校内 / 企业导师分配审核：共用 ViewVerifyProcessRelTeacherStudentMerge，
 * 仅流程类型、文案与列表 jobId 不同，集中在此维护。
 */
import CONSTANT from '@/utils/constant';
import {
  VERIFY_ENTERPRISE_TUTOR_ASSIGNMENT_COLUMNS,
  VERIFY_INTERNAL_TUTOR_ASSIGNMENT_COLUMNS,
  VERIFY_INTERNAL_TUTOR_ASSIGNMENT_KEY_WORD,
} from './assignmentPresets';

/** 供路由页传入 TutorAssignmentVerifyPage */
export const TUTOR_ASSIGNMENT_VERIFY_VARIANT = Object.freeze({
  INTERNAL: 'internal',
  ENTERPRISE: 'enterprise',
});

const REL_TEACHER_STUDENT_TABLE = 'RelTeacherStudent';

function buildJobIdSearchExtra(jobId) {
  return {
    searchKey: { jobId },
    regKey: { jobId: CONSTANT.SEARCH_OPERATOR.EQ },
  };
}

const TUTOR_VERIFY_CONFIG = {
  [TUTOR_ASSIGNMENT_VERIFY_VARIANT.INTERNAL]: {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR,
    pageTitle: '分配校内导师审核',
    noProjectMessage: '当前没有需要审核的校内导师分配数据',
    dlgTitle: '分配校内导师审核',
    recallTitle: '退回已通过的校内导师分配',
    jobId: 3,
    tableColumns: VERIFY_INTERNAL_TUTOR_ASSIGNMENT_COLUMNS,
  },
  [TUTOR_ASSIGNMENT_VERIFY_VARIANT.ENTERPRISE]: {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_ASSIGN_TUTOR,
    pageTitle: '分配企业导师审核',
    noProjectMessage: '当前没有需要审核的企业导师分配数据',
    dlgTitle: '分配企业导师审核',
    recallTitle: '退回已通过的企业导师分配',
    jobId: 4,
    tableColumns: VERIFY_ENTERPRISE_TUTOR_ASSIGNMENT_COLUMNS,
  },
};

/**
 * @param {string} variant - TUTOR_ASSIGNMENT_VERIFY_VARIANT.*
 * @returns {object} AssignmentVerifyPage 所需 props（camelCase，供 v-bind）
 */
export function getTutorAssignmentVerifyBindProps(variant) {
  const c = TUTOR_VERIFY_CONFIG[variant];
  if (!c) {
    throw new Error(
      `[tutorAssignmentVerifyPresets] Unknown variant: ${variant}. Use TUTOR_ASSIGNMENT_VERIFY_VARIANT.`
    );
  }
  return {
    pageTitle: c.pageTitle,
    noProjectMessage: c.noProjectMessage,
    processTypeCode: c.processTypeCode,
    dlgTitle: c.dlgTitle,
    recallTitle: c.recallTitle,
    assignmentTableName: REL_TEACHER_STUDENT_TABLE,
    listKeyWord: VERIFY_INTERNAL_TUTOR_ASSIGNMENT_KEY_WORD,
    initSearchWordsExtra: buildJobIdSearchExtra(c.jobId),
    tableColumns: c.tableColumns,
  };
}
