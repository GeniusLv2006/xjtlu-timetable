<template>
  <div class="compare-page">
    <h2>课表对比</h2>
    <p>与用户 <strong>{{ userId }}</strong> 的课表对比</p>
    <!-- TODO: 双列对比视图 -->
    <div class="compare-placeholder">
      <p>对比视图（待实现）</p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = route.params.userId
</script>

<style scoped>
.compare-placeholder {
  border: 2px dashed #ccc;
  padding: 60px;
  text-align: center;
  color: #999;
  margin-top: 24px;
}
</style>
