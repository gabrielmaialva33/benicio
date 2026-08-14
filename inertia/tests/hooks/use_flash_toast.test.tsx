import { usePage } from '@inertiajs/react'
import { renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFlashToast } from '~/hooks/use_flash_toast'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

function mockPage(flash: Record<string, string>, url = '/clients') {
  vi.mocked(usePage).mockReturnValue({
    url,
    flash,
    props: {},
  } as unknown as ReturnType<typeof usePage>)
}

describe('useFlashToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('raises one toast per flash level the server sent', () => {
    mockPage({ success: 'Cliente cadastrado.', warning: 'Sem pasta ativa.' })

    renderHook(() => useFlashToast())

    expect(toast.success).toHaveBeenCalledWith('Cliente cadastrado.')
    expect(toast.warning).toHaveBeenCalledWith('Sem pasta ativa.')
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('stays quiet when the flash bag is empty', () => {
    mockPage({})

    renderHook(() => useFlashToast())

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('re-raises an identical message on the next visit', () => {
    // Deleting two records in a row flashes the same sentence twice; keying the
    // effect on the flash object alone would swallow the second one.
    mockPage({ success: 'Registro excluído.' }, '/clients')
    const { rerender } = renderHook(() => useFlashToast())

    mockPage({ success: 'Registro excluído.' }, '/clients?page=2')
    rerender()

    expect(toast.success).toHaveBeenCalledTimes(2)
  })
})
