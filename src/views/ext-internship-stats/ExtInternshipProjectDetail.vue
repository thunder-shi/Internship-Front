<template>
  <div class="external-internship-detail page-wrap">
    <el-page-header class="page-header" @back="goBack">
      <template #content>
        <div class="header-title">
          <span class="title-text">{{ displayTitle }}</span>
          <span v-if="internshipId" class="sub-id">项目 ID：{{ internshipId }}</span>
        </div>
      </template>
    </el-page-header>

    <ExtInternshipProjectDetailPanel
      :internship-id="internshipId"
      :internship-name="internshipNameFromQuery"
      :department-id="departmentIdForPanel"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import ExtInternshipProjectDetailPanel from '@/views/ext-internship-stats/ExtInternshipProjectDetailPanel.vue';

defineOptions({
  name: 'ExternalInternshipProjectDetail',
});

const route = useRoute();
const router = useRouter();
const store = useStore();

const userInfo = computed(() => store.getters.userInfo || {});

const internshipId = computed(() => {
  const q = route.query.internshipId;
  if (q == null || q === '') return null;
  const n = Number(q);
  return Number.isNaN(n) ? q : n;
});

const internshipNameFromQuery = computed(() => String(route.query.internshipName || ''));

/** 优先 URL ?departmentId=，否则与统计页一致用账号 departmentId */
const departmentIdForPanel = computed(() => {
  const q = route.query.departmentId;
  if (q != null && q !== '') {
    const n = Number(q);
    return Number.isNaN(n) ? null : n;
  }
  const d = userInfo.value.departmentId;
  if (d == null || d === '') return null;
  const n = Number(d);
  return Number.isNaN(n) ? null : n;
});

const displayTitle = computed(() => {
  if (internshipNameFromQuery.value) return internshipNameFromQuery.value;
  return '校外实习项目详情';
});

function pathWithLastSegment(segment) {
  const parts = route.path.split('/').filter(Boolean);
  if (parts.length) parts[parts.length - 1] = segment;
  return `/${parts.join('/')}`;
}

function goBack() {
  router.push({ path: pathWithLastSegment('ExtInternshipCollegeStats') });
}
</script>

<style scoped>
.page-wrap {
  padding: 12px;
}
.page-header {
  margin-bottom: 16px;
}
.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-text {
  font-size: 16px;
  font-weight: 600;
}
.sub-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}
</style>
