/** 与 axios 请求联动的列表区域全屏块 loading 计数（见 utils/request.js loadingMask） */
const state = {
  count: 0,
};

const mutations = {
  increment(s) {
    s.count += 1;
  },
  decrement(s) {
    s.count = Math.max(0, s.count - 1);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
};
