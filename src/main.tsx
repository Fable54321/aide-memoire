import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from '../src/App/App'
import Week from './App/ClientsAndVegetables/ClientsAndVegetables'
import RFQ from './App/RFQ/RFQ'
import { VegetablesProvider } from './Contexts/vegetablesContext'
import { SalesProvider } from './Contexts/salesContext'
import { RfqProvider } from './Contexts/rfqContext'
import { AuthProvider } from './Contexts/AuthContext'



const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Week />,
      },
      {
        path: 'rfq',
        element: <RFQ />,
      },
    ]
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
        <VegetablesProvider>
          <SalesProvider>
            <RfqProvider>
              <RouterProvider router={router} />
            </RfqProvider>
          </SalesProvider>
        </VegetablesProvider>
    </AuthProvider>
  </StrictMode>,
)
