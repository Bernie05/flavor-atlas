import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { RequireAdmin } from '@/features/auth/components/RequireAdmin'
import { config } from '@/lib/config'
import { AllRecipesPage } from '@/pages/AllRecipesPage'
import { CuisinePage } from '@/pages/CuisinePage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RecipeDetailPage } from '@/pages/RecipeDetailPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

const routes: RouteObject[] = [
  {
    // The public site: read-only.
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'recipes', element: <AllRecipesPage /> },
      { path: 'recipes/:recipeId', element: <RecipeDetailPage /> },
      { path: 'cuisines/:cuisineId', element: <CuisinePage /> },
      { path: 'login', element: <Navigate to="/admin/login" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/login',
    errorElement: <RouteErrorPage />,
    lazy: () => import('@/pages/admin/AdminLoginPage').then((m) => ({ Component: m.AdminLoginPage })),
  },
  {
    // The admin side: every create, edit and delete lives here. Its pages load
    // lazily, so visitors never download the admin area or its form libraries.
    // RequireAdmin shapes the UI; the server enforces the same rule on every write.
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <RequireAdmin />,
        children: [
          { index: true, lazy: () => import('@/pages/admin/AdminDashboardPage').then((m) => ({ Component: m.AdminDashboardPage })) },
          { path: 'recipes', lazy: () => import('@/pages/admin/AdminRecipesPage').then((m) => ({ Component: m.AdminRecipesPage })) },
          { path: 'recipes/new', lazy: () => import('@/pages/admin/AdminNewRecipePage').then((m) => ({ Component: m.AdminNewRecipePage })) },
          {
            path: 'recipes/:recipeId/edit',
            lazy: () => import('@/pages/admin/AdminEditRecipePage').then((m) => ({ Component: m.AdminEditRecipePage })),
          },
          { path: 'reviews', lazy: () => import('@/pages/admin/AdminReviewsPage').then((m) => ({ Component: m.AdminReviewsPage })) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

// The same routes work with either router. The phone demo uses a memory
// router because its host page owns the URL.
export const router =
  config.routerMode === 'memory' ? createMemoryRouter(routes) : createBrowserRouter(routes)
