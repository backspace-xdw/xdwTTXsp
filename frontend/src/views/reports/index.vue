<template>
  <div class="module-page">
    <div class="page-header">
      <h2>{{ title }}</h2>
    </div>
    <div class="page-content">
      <el-empty description="模块开发中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || route.name)
</script>

<style lang="scss" scoped>
.module-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;

  .page-header {
    padding: 16px 24px;
    border-bottom: 1px solid #e8e8e8;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
  }

  .page-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
