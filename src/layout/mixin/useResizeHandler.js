import { onBeforeMount, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'

const { body } = document
const WIDTH = 992 // refer to Bootstrap's responsive design

export function useResizeHandler() {
  const route = useRoute()
  const store = useStore()

  const isMobile = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < WIDTH
  }

  const resizeHandler = () => {
    if (!document.hidden) {
      const mobile = isMobile()
      store.dispatch('app/toggleDevice', mobile ? 'mobile' : 'desktop')

      if (mobile) {
        store.dispatch('app/closeSideBar', { withoutAnimation: true })
      }
    }
  }

  // Watch route changes
  watch(
    () => route.path,
    () => {
      const device = store.getters.device || store.state.app.device
      const sideBar = store.getters.sideBar || store.state.app.sideBar
      if (device === 'mobile' && sideBar?.opened) {
        store.dispatch('app/closeSideBar', { withoutAnimation: false })
      }
    }
  )

  onBeforeMount(() => {
    window.addEventListener('resize', resizeHandler)
  })

  onMounted(() => {
    const mobile = isMobile()
    if (mobile) {
      store.dispatch('app/toggleDevice', 'mobile')
      store.dispatch('app/closeSideBar', { withoutAnimation: true })
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeHandler)
  })
}

