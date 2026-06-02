import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from '../src/App/App'
import Week from './App/ClientsAndVegetables/ClientsAndVegetables'
import { VegetablesProvider } from './Contexts/vegetablesContext'
import { SalesProvider } from './Contexts/salesContext'


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
      <SalesProvider>
        <RouterProvider router={router} />
    </SalesProvider>
    </VegetablesProvider>
  </StrictMode>,
)
