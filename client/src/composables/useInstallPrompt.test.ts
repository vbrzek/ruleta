// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useInstallPrompt } from './useInstallPrompt'

// Helper: mount a component that exposes the composable's return value.
function mountComposable() {
  let api: ReturnType<typeof useInstallPrompt> | undefined
  const Cmp = defineComponent({
    setup() {
      api = useInstallPrompt()
      return () => h('div')
    },
  })
  const wrapper = mount(Cmp)
  return { wrapper, api: api! }
}

function fakeBeforeInstallPromptEvent() {
  const userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' })
  // NOTE: no `type` key here — a real `Event` from `new Event(...)` already has a
  // read-only `type` getter, and Object.assign-ing `type` onto it throws in jsdom.
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn(() => Promise.resolve()),
    userChoice,
  }
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64)',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('captures beforeinstallprompt and sets canInstall', async () => {
    const { api } = mountComposable()
    expect(api.canInstall.value).toBe(false)
    const evt = fakeBeforeInstallPromptEvent()
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), evt))
    await nextTick()
    expect(evt.preventDefault).toHaveBeenCalled()
    expect(api.canInstall.value).toBe(true)
  })

  it('promptInstall calls prompt() when a deferred event exists', async () => {
    const { api } = mountComposable()
    const evt = fakeBeforeInstallPromptEvent()
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), evt))
    await nextTick()
    await api.promptInstall()
    expect(evt.prompt).toHaveBeenCalled()
    expect(api.canInstall.value).toBe(false)
  })

  it('promptInstall shows iOS hint when no deferred event', async () => {
    const { api } = mountComposable()
    expect(api.showIosHint.value).toBe(false)
    await api.promptInstall()
    expect(api.showIosHint.value).toBe(true)
  })

  it('detects standalone via matchMedia', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { api } = mountComposable()
    expect(api.isStandalone.value).toBe(true)
  })

  it('detects iOS from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { api } = mountComposable()
    expect(api.isIOS.value).toBe(true)
  })

  it('showInstallButton: hidden when standalone', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { api } = mountComposable()
    expect(api.showInstallButton.value).toBe(false)
  })

  it('showInstallButton: visible on iOS when not standalone', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { api } = mountComposable()
    expect(api.showInstallButton.value).toBe(true)
  })
})
