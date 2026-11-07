import { systemDocumentation } from '@/features/legal/data/system-documentation'

export type SupportLink = {
  label: string
  href: string
  description?: string
}

export type SupportAnswer = {
  text: string
  links?: SupportLink[]
  /** Suggested follow-up prompts shown as chat chips */
  suggestions?: string[]
}

export type KnowledgeEntry = {
  id: string
  keywords: string[]
  answer: SupportAnswer
}

export const SUPPORT_EMAIL = 'support@support.com'

export function getUserManualLinks(): SupportLink[] {
  return systemDocumentation.map((system) => {
    const guide = system.resources.find((r) => r.kind === 'guide')
    return {
      label: `${system.name} — User guide`,
      href: guide?.href ?? '/support',
      description: system.description,
    }
  })
}

export function getAllDocLinks(): SupportLink[] {
  return systemDocumentation.flatMap((system) =>
    system.resources.map((resource) => ({
      label: `${system.name} — ${resource.label}`,
      href: resource.href,
      description: resource.description,
    }))
  )
}

export const supportKnowledge: KnowledgeEntry[] = [
  {
    id: 'greeting',
    keywords: [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'howdy',
      'yo',
      'hiya',
    ],
    answer: {
      text: "Hey there — welcome! I can help with sign-in, MFA, SSO launches, missing platforms, or point you to user manuals.\n\nWhat are you trying to do today?",
      suggestions: [
        'I cannot sign in',
        'SSO launch is failing',
        'Show me user manuals',
        'A platform is missing',
      ],
    },
  },
  {
    id: 'how-are-you',
    keywords: ['how are you', 'how r you', "how's it going", 'whats up', "what's up"],
    answer: {
      text: "I'm doing great — ready to help you get into the right platform.\n\nNeed help with login, SSO, or finding a user guide?",
      suggestions: ['Help with MFA', 'Fix SSO launch', 'Show user manuals'],
    },
  },
  {
    id: 'thanks',
    keywords: ['thank', 'thanks', 'thank you', 'thx', 'ty', 'appreciate'],
    answer: {
      text: "You're welcome! If anything else comes up — login, SSO, or manuals — just ask.",
      suggestions: ['Show user manuals', 'Contact support'],
    },
  },
  {
    id: 'bye',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'that is all', "that's all", 'done'],
    answer: {
      text: 'Sounds good. Have a smooth day — and you can reopen this chat anytime if you need help again.',
    },
  },
  {
    id: 'who-are-you',
    keywords: ['who are you', 'what can you do', 'help me', 'capabilities', 'what do you do'],
    answer: {
      text: "I'm the Unified Access support assistant. I can walk you through:\n• Signing in and MFA\n• Platform tiles vs roles inside USiS, ULMIS, UFMS, and other apps\n• Fixing SSO launch issues\n• Finding user manuals and CIS API docs\n\nTell me what's going wrong, or pick a topic below.",
      suggestions: [
        'I cannot sign in',
        'SSO launch is failing',
        'Show me user manuals',
        'Wrong menus after SSO',
        'A platform is missing',
      ],
    },
  },
  {
    id: 'manuals',
    keywords: [
      'manual',
      'guide',
      'user guide',
      'documentation',
      'docs',
      'handbook',
      'how to use',
      'tutorial',
      'show me user',
    ],
    answer: {
      text: "Sure — here are the user manuals for each system. Open whichever matches what you're working on:",
      links: getUserManualLinks(),
      suggestions: ['API documentation', 'Help with MFA', 'Contact support'],
    },
  },
  {
    id: 'api',
    keywords: ['api', 'swagger', 'openapi', 'endpoint', 'specs', 'developer'],
    answer: {
      text: 'Got it — developers usually want either the readable module manuals or the unified CIS Swagger UI at Base API `/api/v1/docs`:',
      links: getAllDocLinks().filter(
        (l) =>
          l.label.includes('API specs') ||
          l.label.includes('Interactive API') ||
          l.label.includes('OpenAPI')
      ),
      suggestions: ['Show user manuals', 'Contact support'],
    },
  },
  {
    id: 'mfa',
    keywords: [
      'mfa',
      '2fa',
      'otp',
      'authenticator',
      'one-time',
      'verification code',
      'six digit',
      'code',
    ],
    answer: {
      text: "For MFA, after your password you'll see a code screen. Open your authenticator app and enter the 6-digit code.\n\nTips:\n• Codes expire quickly — type it soon after it refreshes\n• Kiosk/system accounts can't sign in here\n• If you lost your authenticator, an identity admin needs to reset MFA for you\n\nWant the Identity guide for the full walkthrough?",
      links: [
        {
          label: 'Identity — User guide',
          href: '/docs/Identity-Complete-Guide.html',
          description: 'Sign-in and MFA steps',
        },
      ],
      suggestions: ['I cannot sign in', 'Contact support', 'Show user manuals'],
    },
  },
  {
    id: 'sso',
    keywords: [
      'sso',
      'launch',
      'single sign',
      'redirect',
      'open platform',
      'cannot launch',
      'failing',
      'failed',
    ],
    answer: {
      text: "SSO launch problems are usually an expired session or a stopped API. Try this:\n1. Sign out of Unified Access\n2. Sign in again (Identity API on 3411 and Base API on 3500 must be running locally)\n3. Click the platform card once\n\nInside the app, if menus look wrong, check Identity **roles** in Portal Admin — platform access alone is not full registrar/staff access.",
      links: [
        {
          label: 'Identity — User guide',
          href: '/docs/Identity-Complete-Guide.html',
        },
      ],
      suggestions: ['Wrong menus after SSO', 'A platform is missing', 'Contact support', 'Show user manuals'],
    },
  },
  {
    id: 'platform-access',
    keywords: [
      'missing',
      'platform',
      'assigned',
      'no app',
      'cannot see',
      'not showing',
      'tile',
      'launcher',
    ],
    answer: {
      text: "The launcher only shows platforms assigned to your account.\n\nAsk an identity administrator (Portal Admin → Users) to assign the platform code — e.g. `enrollment` for USiS, `records` for TORMS, `library`, `finance`, `docstrack`, `inventory`.\n\nHaving a platform still does not grant every menu inside the app; roles control that (see “Wrong menus after SSO”).",
      suggestions: [
        'Wrong menus after SSO',
        'USiS help',
        'ULMIS Library help',
        'Contact support',
      ],
    },
  },
  {
    id: 'rbac-menus',
    keywords: [
      'wrong menu',
      'registrar',
      'student portal',
      'access denied',
      'permission',
      '403',
      'forbidden',
      'role',
      'staff access',
      'see everything',
      'all menus',
    ],
    answer: {
      text: "Two layers matter:\n1. **Platform** — must be assigned to see the launcher tile and SSO in.\n2. **Identity role** — maps to permission packs inside each app.\n\nExamples:\n• `student` → USiS `/student` only, not registrar\n• `registrar` → USiS registrar portal\n• `employee` alone → launch only unless another role is added\n\nPortal Admin shows access notes under each role checkbox. Share your email and needed role with an identity admin.",
      links: [
        {
          label: 'USiS — User guide',
          href: '/docs/USIS-Complete-Guide.html',
          description: 'Role packs and student vs registrar',
        },
        {
          label: 'Identity — User guide',
          href: '/docs/Identity-Complete-Guide.html',
          description: 'Platforms, roles, Portal Admin',
        },
      ],
      suggestions: ['A platform is missing', 'USiS help', 'Contact support'],
    },
  },
  {
    id: 'login',
    keywords: [
      'login',
      'sign in',
      'password',
      'cannot login',
      'cant login',
      "can't login",
      'locked',
      'account',
      'cannot sign',
      "can't sign",
      'eye icon',
      'show password',
    ],
    answer: {
      text: "Sign in at the WMSU Portal with your Identity email and password. Use the eye icon on the password field to show or hide what you type.\n\nAfter login:\n• Launcher tiles = assigned **platforms**\n• Menus inside USiS/ULMIS/etc. = Identity **roles**\n\nIf you see “Identity upstream unavailable,” the Identity API (3411) or Base API proxy (3500) may be down.\n\nStuck on MFA instead of password? Say “Help with MFA”.",
      links: [
        {
          label: 'Identity — User guide',
          href: '/docs/Identity-Complete-Guide.html',
        },
      ],
      suggestions: ['Help with MFA', 'SSO launch is failing', 'Wrong menus after SSO', 'Contact support'],
    },
  },
  {
    id: 'ulmis',
    keywords: ['ulmis', 'library', 'opac', 'kiosk', 'circulation', 'catalog'],
    answer: {
      text: "ULMIS covers library staff web, public OPAC, and kiosk. Identity `student` maps to member/OPAC; staff packs need library platform plus appropriate roles (`employee` with library.* or dedicated staff roles).",
      links: [
        {
          label: 'ULMIS Library — User guide',
          href: '/docs/ULMIS-Complete-Guide.html',
          description: 'Circulation, catalog, and kiosk workflows',
        },
      ],
      suggestions: ['ULMIS API specs', 'Show user manuals', 'SSO launch is failing'],
    },
  },
  {
    id: 'usis',
    keywords: [
      'usis',
      'us i s',
      'enrollment',
      'student information',
      'registrar portal',
      'student portal',
    ],
    answer: {
      text: 'USiS (Enrollment) opens from the portal when the `enrollment` platform is assigned. Students land on the student portal; registrars need the `registrar` role for applicants and student records.',
      links: [
        {
          label: 'USiS — User guide',
          href: '/docs/USIS-Complete-Guide.html',
          description: 'SSO, roles, troubleshooting',
        },
      ],
      suggestions: ['Wrong menus after SSO', 'USiS API specs', 'Show user manuals'],
    },
  },
  {
    id: 'torms',
    keywords: ['torms', 'transcript', 'records', 'certification', 'tor '],
    answer: {
      text: 'TORMS (Records) handles transcripts, certifications, and registrar records workflows. Assign the `records` platform; staff typically need `records_officer` or `identity_admin`.',
      links: [
        {
          label: 'TORMS — User guide',
          href: '/docs/TORMS-Complete-Guide.html',
        },
      ],
      suggestions: ['Wrong menus after SSO', 'Show user manuals', 'Contact support'],
    },
  },
  {
    id: 'uims',
    keywords: ['uims', 'inventory', 'stock', 'assets', 'supply'],
    answer: {
      text: 'UIMS is inventory and assets for the Supply Office. Launch from the portal with the `inventory` platform; permissions follow Identity role packs.',
      links: [
        {
          label: 'UIMS — User guide',
          href: '/docs/UIMS-Complete-Guide.html',
        },
      ],
      suggestions: ['Show user manuals', 'A platform is missing', 'Contact support'],
    },
  },
  {
    id: 'ufms',
    keywords: [
      'ufms',
      'finance',
      'accounting',
      'budget',
      'procurement',
      'pos',
      'cashier',
    ],
    answer: {
      text: 'UFMS Finance covers budget, accounting (GL/JEV in the Accounting sidebar), procurement, and POS. There is no separate University Accounting tile — accounting lives inside UFMS. Assign `finance` platform plus roles such as `cashier` or finance staff packs.',
      links: [
        {
          label: 'UFMS Finance — User guide',
          href: '/docs/UFMS-Complete-Guide.html',
        },
      ],
      suggestions: ['UFMS Finance help', 'Show user manuals', 'A platform is missing'],
    },
  },
  {
    id: 'docstrack',
    keywords: ['docstrack', 'udms', 'document', 'approval', 'tracking', 'cdts'],
    answer: {
      text: 'UDMS Documents handles university documents, approvals, and tracking. `employee` with the documents platform typically gets view/download unless approver roles are assigned.',
      links: [
        {
          label: 'UDMS — User guide',
          href: '/docs/DocsTrack-Complete-Guide.html',
        },
      ],
      suggestions: ['UDMS API specs', 'Show user manuals', 'Contact support'],
    },
  },
  {
    id: 'contact',
    keywords: ['contact', 'email', 'support', 'help desk', 'ticket', 'human', 'admin'],
    answer: {
      text: `Absolutely. Reach the support team at ${SUPPORT_EMAIL}.\n\nPlease include your full name, email, and a short description of the issue — that helps them respond faster. You can also copy the address from the Support center.`,
      links: [{ label: 'Support center', href: '/support' }],
      suggestions: ['Show user manuals', 'I cannot sign in'],
    },
  },
  {
    id: 'terms-privacy',
    keywords: ['terms', 'privacy', 'policy', 'legal'],
    answer: {
      text: 'Sure — here are the legal pages for University Platform Access:',
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
      ],
      suggestions: ['Contact support', 'Show user manuals'],
    },
  },
]

export const welcomeAnswer: SupportAnswer = {
  text: "Hi! I'm your Unified Access support assistant.\n\nI can help with sign-in, MFA, SSO launches, platform tiles, roles inside USiS and other apps, or point you to user manuals. What do you need?",
  suggestions: [
    'I cannot sign in',
    'SSO launch is failing',
    'Wrong menus after SSO',
    'Show me user manuals',
    'A platform is missing',
  ],
}

export const fallbackAnswer: SupportAnswer = {
  text: "I want to make sure I help with the right thing. Could you tell me a bit more?\n\nFor example: are you stuck signing in, launching a platform, looking for a user manual, or needing to contact support?",
  suggestions: [
    'I cannot sign in',
    'SSO launch is failing',
    'Show me user manuals',
    'Contact support',
  ],
}

/** Exact / near-exact phrases that should map cleanly for suggestion chips */
export const suggestedPrompts = [
  'I cannot sign in',
  'SSO launch is failing',
  'Wrong menus after SSO',
  'Show me user manuals',
] as const
