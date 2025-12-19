import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'

export function useFixIOSBug(subMenuRef) {
  const store = useStore()
  
  const device = computed(() => store.state.app.device)
  
  const fixBugIniOS = () => {
    const $subMenu = subMenuRef.value
    if ($subMenu) {
      const handleMouseleave = $subMenu.handleMouseleave
      $subMenu.handleMouseleave = (e) => {
        if (device.value === 'mobile') {
          return
        }
        handleMouseleave(e)
      }
    }
  }
  
  onMounted(() => {
    // In order to fix the click on menu on the ios device will trigger the mouseleave bug
    // https://github.com/PanJiaChen/vue-element-admin/issues/1135
    fixBugIniOS()
  })
}
