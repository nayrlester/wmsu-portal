export class LauncherCatalogService {
  catalog() {
    return {
      success: true,
      message: 'WMSU application launcher catalog',
      data: {
        source: 'common-platform',
        mode: 'modular-monolith-in-process',
        entry: 'http://127.0.0.1:5173',
        note: 'Sign in at web-portal; platforms are filtered by identity role grants.',
        apps: [
          {
            code: 'portal',
            name: 'WMSU Portal',
            url: 'http://127.0.0.1:5173',
            apiEntry: 'http://127.0.0.1:3500',
            note: 'Main entry — login then launch role-assigned systems',
          },
          {
            code: 'enrollment',
            name: 'Enrollment (USiS)',
            url: 'http://127.0.0.1:5180',
            apiEntry: 'http://127.0.0.1:3500/api/v1/enrollment',
          },
          {
            code: 'records',
            name: 'Records (TORMS)',
            url: 'http://127.0.0.1:5181',
            apiEntry: 'http://127.0.0.1:3500/api/v1/records',
          },
          {
            code: 'finance',
            name: 'Finance (UFMS)',
            url: 'http://127.0.0.1:5182',
            apiEntry: 'http://127.0.0.1:3500/api/v1/finance',
          },
          {
            code: 'library',
            name: 'Library (ULMIS)',
            url: 'http://127.0.0.1:5183',
            opacUrl: 'http://127.0.0.1:5186',
            kioskUrl: 'http://127.0.0.1:5187',
            apiEntry: 'http://127.0.0.1:3500/api/v1/library',
          },
          {
            code: 'inventory',
            name: 'Inventory (UIMS)',
            url: 'http://127.0.0.1:5184',
            apiEntry: 'http://127.0.0.1:3500/api/v1/inventory',
          },
          {
            code: 'documents',
            name: 'Documents (UDMS)',
            url: 'http://127.0.0.1:5185',
            apiEntry: 'http://127.0.0.1:3500/api/v1/documents',
          },
          {
            code: 'admin',
            name: 'Administration',
            url: 'http://127.0.0.1:5174',
            apiEntry: 'http://127.0.0.1:3500',
          },
        ],
      },
    }
  }
}

export const launcherCatalogService = new LauncherCatalogService()
