import {
  fallbackAnswer,
  supportKnowledge,
  type SupportAnswer,
} from '@/features/support-chat/data/knowledge'

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isShortGreeting(q: string) {
  return /^(hi|hello|hey|yo|hiya|howdy)( there)?[!?.]*$/.test(q)
}

/**
 * Conversational matcher:
 * - greets naturally
 * - scores keyword / phrase hits
 * - uses recent topic for short follow-ups ("yes", "that", "api")
 */
export function answerSupportQuestion(
  question: string,
  recentAssistantText = ''
): SupportAnswer {
  const q = normalize(question)
  if (!q) return fallbackAnswer

  if (isShortGreeting(q)) {
    return supportKnowledge.find((e) => e.id === 'greeting')!.answer
  }

  // Short acknowledgements after a bot reply
  if (/^(yes|yep|yeah|ok|okay|sure|please|that one|this one)$/.test(q)) {
    const recent = normalize(recentAssistantText)
    if (recent.includes('mfa') || recent.includes('authenticator')) {
      return supportKnowledge.find((e) => e.id === 'mfa')!.answer
    }
    if (recent.includes('sso') || recent.includes('launch')) {
      return supportKnowledge.find((e) => e.id === 'sso')!.answer
    }
    if (recent.includes('manual') || recent.includes('guide')) {
      return supportKnowledge.find((e) => e.id === 'manuals')!.answer
    }
    if (recent.includes('role') || recent.includes('registrar') || recent.includes('student portal')) {
      return supportKnowledge.find((e) => e.id === 'rbac-menus')!.answer
    }
    return {
      text: 'Happy to continue — which of these fits best?',
      suggestions: [
        'I cannot sign in',
        'SSO launch is failing',
        'Show me user manuals',
        'Contact support',
      ],
    }
  }

  // Narrow follow-ups like "api specs" after a product mention
  if (/^(api|api specs|swagger|user guide|manual)$/.test(q)) {
    const recent = normalize(recentAssistantText)
    if (recent.includes('ulmis') || recent.includes('library')) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the ULMIS API reference:',
            links: [
              {
                label: 'ULMIS — API specs',
                href: '/docs/ULMIS-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Show user manuals', 'SSO launch is failing'],
          }
        : supportKnowledge.find((e) => e.id === 'ulmis')!.answer
    }
    if (
      recent.includes('ufms') ||
      recent.includes('finance') ||
      recent.includes('accounting') ||
      recent.includes('hris') ||
      recent.includes('payroll')
    ) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the UFMS Finance API reference:',
            links: [
              {
                label: 'UFMS — API specs',
                href: '/docs/UFMS-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Show user manuals', 'Contact support'],
          }
        : supportKnowledge.find((e) => e.id === 'ufms')!.answer
    }
    if (recent.includes('docstrack') || recent.includes('udms')) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the DocsTrack API reference:',
            links: [
              {
                label: 'DocsTrack — API specs',
                href: '/docs/DocsTrack-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Show user manuals', 'Contact support'],
          }
        : supportKnowledge.find((e) => e.id === 'docstrack')!.answer
    }
    if (recent.includes('usis') || recent.includes('enrollment')) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the USiS / enrollment API reference:',
            links: [
              {
                label: 'USiS — API specs',
                href: '/docs/USIS-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Wrong menus after SSO', 'Show user manuals'],
          }
        : supportKnowledge.find((e) => e.id === 'usis')!.answer
    }
    if (recent.includes('torms') || recent.includes('records')) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the TORMS / records API reference:',
            links: [
              {
                label: 'TORMS — API specs',
                href: '/docs/TORMS-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Show user manuals', 'Contact support'],
          }
        : supportKnowledge.find((e) => e.id === 'torms')!.answer
    }
    if (recent.includes('uims') || recent.includes('inventory')) {
      return q.includes('api') || q.includes('swagger')
        ? {
            text: 'Here’s the UIMS API reference:',
            links: [
              {
                label: 'UIMS — API specs',
                href: '/docs/UIMS-API-Specs-Manual.html',
              },
            ],
            suggestions: ['Show user manuals', 'Contact support'],
          }
        : supportKnowledge.find((e) => e.id === 'uims')!.answer
    }
  }

  if (/^wrong menus after sso$/i.test(question.trim())) {
    return supportKnowledge.find((e) => e.id === 'rbac-menus')!.answer
  }

  let best: { score: number; id: string; answer: SupportAnswer } | null = null

  for (const entry of supportKnowledge) {
    let score = 0
    for (const keyword of entry.keywords) {
      const k = normalize(keyword)
      if (!k) continue

      if (q === k) {
        score += k.split(' ').length * 6
      } else if (q.includes(k)) {
        // Avoid matching tiny tokens like "hi" inside other words / longer sentences weakly
        if (k.length <= 2 && q !== k) continue
        score += k.split(' ').length * 2 + Math.min(k.length, 8)
      }
    }

    // Boost conversational intents when message is short
    if (entry.id === 'greeting' && isShortGreeting(q)) score += 20
    if (entry.id === 'thanks' && /\b(thanks|thank|thx|ty)\b/.test(q)) score += 12
    if (entry.id === 'bye' && /\b(bye|goodbye|later)\b/.test(q)) score += 12

    if (score > 0 && (!best || score > best.score)) {
      best = { score, id: entry.id, answer: entry.answer }
    }
  }

  // Require a minimum score so weak single-token noise doesn't force a wrong topic
  if (!best || best.score < 3) {
    return fallbackAnswer
  }

  return best.answer
}
