export const platformBranding = {
  identity: {
    logoSrc: '/identity-mark.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5173',
  },
  enrollment: {
    logoSrc: '/usis-logo.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5180',
  },
  records: {
    logoSrc: '/torms-logo.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5181',
  },
  library: {
    logoSrc: '/ulmis-library.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5183',
  },
  finance: {
    logoSrc: '/ufms-logo.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5182',
  },
  documents: {
    logoSrc: '/udms-mark.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5185',
  },
  inventory: {
    logoSrc: '/uims-mark.svg',
    logoTone: 'bg-white ring-1 ring-[#e6e9ff]',
    localWeb: 'http://127.0.0.1:5184',
  },
} as const

export const launcherPlatformLogos: Record<string, string> = {
  enrollment: platformBranding.enrollment.logoSrc,
  records: platformBranding.records.logoSrc,
  finance: platformBranding.finance.logoSrc,
  library: platformBranding.library.logoSrc,
  library_opac: '/ulmis-opac.svg',
  library_kiosk: '/ulmis-kiosk.svg',
  docstrack: platformBranding.documents.logoSrc,
  documents: platformBranding.documents.logoSrc,
  uims: platformBranding.inventory.logoSrc,
  inventory: platformBranding.inventory.logoSrc,
  admin: '/wmsu-seal.png',
}

export const launcherPlatformTones: Record<string, string> = {
  enrollment: platformBranding.enrollment.logoTone,
  records: platformBranding.records.logoTone,
  finance: platformBranding.finance.logoTone,
  library: platformBranding.library.logoTone,
  library_opac: platformBranding.library.logoTone,
  library_kiosk: platformBranding.library.logoTone,
  docstrack: platformBranding.documents.logoTone,
  documents: platformBranding.documents.logoTone,
  uims: platformBranding.inventory.logoTone,
  inventory: platformBranding.inventory.logoTone,
  admin: platformBranding.identity.logoTone,
}
