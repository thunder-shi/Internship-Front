<template>
  <div class="not-found">
    <img src="@/assets/img/404.png" alt="404" class="img-404" />
    <h2>页面未找到</h2>
    <p>您访问的页面不存在或已被删除。</p>
    <a href="/" class="return-home">返回首页</a>
  </div>
</template>

<script>
export default {
  name: 'Page404'
}
</script>

<style scoped>
.not-found {
  text-align: center;
  padding: 80px 20px;
}
.img-404 {
  width: 200px;
  margin-bottom: 20px;
}
.return-home {
  display: inline-block;
  margin-top: 30px;
  padding: 8px 24px;
  background: #1482f0;
  color: #fff;
  border-radius: 24px;
  text-decoration: none;
  font-size: 16px;
}
</style>