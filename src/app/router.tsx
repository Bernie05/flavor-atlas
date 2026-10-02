import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <PlaceholderPage title="Explore cuisines" /> },
      { path: 'cuisines/:cuisineId', element: <PlaceholderPage title="Cuisine" /> },
      { path: 'recipes/new', element: <PlaceholderPage title="New recipe" /> },
      { path: 'recipes/:recipeId', element: <PlaceholderPage title="Recipe detail" /> },
      { path: 'recipes/:recipeId/edit', element: <PlaceholderPage title="Edit recipe" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
