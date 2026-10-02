import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAdmin } from '@/features/auth/components/RequireAdmin'
import { config } from '@/lib/config'
import { CuisinePage } from '@/pages/CuisinePage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RecipeDetailPage } from '@/pages/RecipeDetailPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cuisines/:cuisineId', element: <CuisinePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        // Admin-only pages. The server enforces the same rule on every write.
        element: <RequireAdmin />,
        children: [
          // The editor pages pull in the form libraries. Loading them lazily keeps
          // those out of the bundle for people who only browse recipes.
          {
            path: 'recipes/new',
            lazy: () => import('@/pages/NewRecipePage').then((m) => ({ Component: m.NewRecipePage })),
          },
          {
            path: 'recipes/:recipeId/edit',
            lazy: () => import('@/pages/EditRecipePage').then((m) => ({ Component: m.EditRecipePage })),
          },
        ],
      },
      { path: 'recipes/:recipeId', element: <RecipeDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

// The same routes work with either router. The phone demo uses a memory
// router because its host page owns the URL.
export const router =
  config.routerMode === 'memory' ? createMemoryRouter(routes) : createBrowserRouter(routes)
