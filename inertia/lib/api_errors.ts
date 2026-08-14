/*
|--------------------------------------------------------------------------
| API error messages
|--------------------------------------------------------------------------
|
| The API answers with a few different error envelopes (`message`, `error`, or
| a VineJS `errors[]` array) and its wording is written for developers. This
| module picks the message out of whichever shape arrived and, when it is a
| known constraint, swaps it for copy a lawyer can act on.
|
| Anything unrecognised passes through untouched: a raw upstream sentence is
| worse than a friendly one, but far better than a generic "erro inesperado"
| that hides what actually happened.
|
*/

interface ApiErrorEnvelope {
  message?: string
  error?: string
  errors?: Array<{ message?: string }>
}

const KNOWN_CONSTRAINTS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /client .*has active folders|cliente .*pastas ativas/i,
    message:
      'Este cliente ainda tem pastas ativas. Encerre ou transfira as pastas antes de excluir.',
  },
  {
    pattern: /folder .*has active processes|pasta .*processos ativos/i,
    message: 'Esta pasta ainda tem processos ativos e por isso não pode ser excluída.',
  },
  {
    pattern: /cnj.*(already|unique|duplic)/i,
    message: 'Já existe um processo ativo com este número CNJ neste escritório.',
  },
  {
    pattern: /invalid cnj|cnj.*(check digit|mod ?97)/i,
    message: 'Número CNJ inválido: confira os 20 dígitos e o dígito verificador.',
  },
  {
    pattern: /conversation is generating|409/i,
    message: 'A conversa ainda está gerando uma resposta. Aguarde a conclusão para continuar.',
  },
  {
    pattern: /ai provider .*(disabled|unavailable)|503/i,
    message: 'O assistente de IA está indisponível no momento.',
  },
]

function humanize(rawMessage: string) {
  const text = rawMessage.trim()
  return KNOWN_CONSTRAINTS.find((constraint) => constraint.pattern.test(text))?.message ?? text
}

/** Reads a `fetch` Response body and returns the message worth showing. */
export async function readApiErrorMessage(
  response: Response,
  fallback = 'Não foi possível concluir a operação.'
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null

  const raw =
    payload?.message ||
    payload?.error ||
    payload?.errors?.find((entry) => entry.message)?.message ||
    fallback

  return humanize(raw)
}

/** Same normalisation for a message already in hand (thrown Error, SSE event). */
export function toUserFacingMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.'
): string {
  if (error instanceof Error && error.message) return humanize(error.message)
  if (typeof error === 'string' && error.trim()) return humanize(error)
  return fallback
}
