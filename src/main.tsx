import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from '../src/App/App'
import Week from './App/Week/Week'
import { VegetablesProvider } from './Contexts/vegetablesContext'


const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Week />,
      },
    ]
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VegetablesProvider>
    <RouterProvider router={router} />
    </VegetablesProvider>
  </StrictMode>,
)
