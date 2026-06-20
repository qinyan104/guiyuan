<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'

onLaunch(() => {
  console.log('归源小程序启动')
  const auth = useAuthStore()
  auth.restoreSession()
})
</script>

<style>
page {
  background-color: #f8f4ed;
  color: #241a10;
  font-family: 'Noto Serif SC', 'Songti SC', 'PingFang SC', serif;
  font-size: 28rpx;
  line-height: 1.6;
}
</style>
