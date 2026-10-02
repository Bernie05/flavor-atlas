import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { config } from '@/lib/config'
import { CuisinePage } from '@/pages/CuisinePage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
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
      { path: 'recipes/new', element: <PlaceholderPage title="New recipe" /> },
      { path: 'recipes/:recipeId', element: <RecipeDetailPage /> },
      { path: 'recipes/:recipeId/edit', element: <PlaceholderPage title="Edit recipe" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

// The same routes work with either router. The phone demo uses a memory
// router because its host page owns the URL.
export const router =
  config.routerMode === 'memory' ? createMemoryRouter(routes) : createBrowserRouter(routes)
