<template>
  <button class="back-button" @click="handleBack" :title="title">
    <el-icon><ArrowLeft /></el-icon>
    <span v-if="showText">{{ text }}</span>
  </button>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

interface Props {
  to?: string
  text?: string
  showText?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  to: '',
  text: '返回',
  showText: true,
  title: '返回上一页'
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const router = useRouter()

const handleBack = () => {
  emit('click')
  if (props.to) {
    router.push(props.to)
  } else {
    router.back()
  }
}
</script>

<style lang="scss" scoped>
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-family: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }

  &:active {
    transform: translateX(0);
  }

  .el-icon {
    font-size: 16px;
  }

  span {
    font-weight: 500;
  }
}
</style>
