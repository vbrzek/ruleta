import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const deferred = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const showIosHint = ref(false)

  // Client-only SPA (see useSound.ts): window/navigator are always present.
  const isStandalone = ref(
    window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
  )

  const isIOS = ref(
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone.value,
  )

  const showInstallButton = computed(
    () => !isStandalone.value && (canInstall.value || isIOS.value),
  )

  function onBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferred.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function onInstalled() {
    deferred.value = null
    canInstall.value = false
  }

  async function promptInstall() {
    if (deferred.value) {
      await deferred.value.prompt()
      try {
        await deferred.value.userChoice
      } finally {
        deferred.value = null
        canInstall.value = false
      }
    } else {
      showIosHint.value = true
    }
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  return {
    canInstall,
    isStandalone,
    isIOS,
    showIosHint,
    showInstallButton,
    promptInstall,
  }
}
