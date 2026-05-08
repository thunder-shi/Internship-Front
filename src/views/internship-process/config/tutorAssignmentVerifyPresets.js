/**
 * 校内 / 企业导师分配审核：按合并视图区分数据
 * - ViewVerifyProcessRelIntTeacherStudentMerge：校内导师
 * - ViewVerifyProcessRelEntTeacherStudentMerge：企业导师（Ass）
 */
import CONSTANT from '@/utils/constant';
import {
  VERIFY_ENTERPRISE_TUTOR_ASSIGNMENT_COLUMNS,
  VERIFY_INTERNAL_TUTOR_ASSIGNMENT_COLUMNS,
  VERIFY_INTERNAL_TUTOR_ASSIGNMENT_KEY_WORD,
  VERIFY_ENTERPRISE_TUTOR_ASSIGNMENT_KEY_WORD,
} from './assignmentPresets';

/** 供路由页传入 TutorAssignmentVerifyPage */
export const TUTOR_ASSIGNMENT_VERIFY_VARIANT = Object.freeze({
  INTERNAL: 'internal',
  ENTERPRISE: 'enterprise',
});

const REL_TEACHER_STUDENT_TABLE = 'RelTeacherStudent';

const TUTOR_VERIFY_CONFIG = {
  [TUTOR_ASSIGNMENT_VERIFY_VARIANT.INTERNAL]: {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR,
    pageTitle: '分配校内导师审核',
    noProjectMessage: '当前没有需要审核的校内导师分配数据',
    dlgTitle: '分配校内导师审核',
    recallTitle: '退回已通过的校内导师分配',
    listKeyWord: VERIFY_INTERNAL_TUTOR_ASSIGNMENT_KEY_WORD,
    tableColumns: VERIFY_INTERNAL_TUTOR_ASSIGNMENT_COLUMNS,
  },
  [TUTOR_ASSIGNMENT_VERIFY_VARIANT.ENTERPRISE]: {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_ASSIGN_TUTOR,
    pageTitle: '分配企业导师审核',
    noProjectMessage: '当前没有需要审核的企业导师分配数据',
    dlgTitle: '分配企业导师审核',
    recallTitle: '退回已通过的企业导师分配',
    listKeyWord: VERIFY_ENTERPRISE_TUTOR_ASSIGNMENT_KEY_WORD,
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
    listKeyWord: c.listKeyWord,
    tableColumns: c.tableColumns,
  };
}
