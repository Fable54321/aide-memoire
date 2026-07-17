import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { rfqSuppliers } from "../App/ClientsAndVegetables/suppliers"
import { fetchWithAuth } from "../Utils/fetchWithAuth"

export type RfqProduct = {
  id: number
  client_id: number
  name: string
  display_order: number
}

type ClientProductsResponse = {
  client: { id: number; name: string }
  products: RfqProduct[]
}

type RfqContextType = {
  productsByClient: Record<number, RfqProduct[]>
  loadingByClient: Record<number, boolean>
  errorsByClient: Record<number, string | null>
  loadClientProducts: (clientId: number) => Promise<void>
}

const RfqContext = createContext<RfqContextType | undefined>(undefined)

export const RfqProvider = ({ children }: { children: ReactNode }) => {
  const [productsByClient, setProductsByClient] = useState<Record<number, RfqProduct[]>>({})
  const [loadingByClient, setLoadingByClient] = useState<Record<number, boolean>>({})
  const [errorsByClient, setErrorsByClient] = useState<Record<number, string | null>>({})

  const loadClientProducts = useCallback(async (clientId: number) => {
    setLoadingByClient((current) => ({ ...current, [clientId]: true }))
    setErrorsByClient((current) => ({ ...current, [clientId]: null }))

    try {
      const response = await fetchWithAuth<ClientProductsResponse>(
        `/sales/clients/${clientId}/products`,
      )
      setProductsByClient((current) => ({ ...current, [clientId]: response.products }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les produits."
      setErrorsByClient((current) => ({ ...current, [clientId]: message }))
    } finally {
      setLoadingByClient((current) => ({ ...current, [clientId]: false }))
    }
  }, [])

  useEffect(() => {
    rfqSuppliers.forEach(({ id }) => void loadClientProducts(id))
  }, [loadClientProducts])

  return (
    <RfqContext.Provider
      value={{ productsByClient, loadingByClient, errorsByClient, loadClientProducts }}
    >
      {children}
    </RfqContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRfq = () => {
  const context = useContext(RfqContext)
  if (!context) throw new Error("useRfq doit être utilisé à l'intérieur de RfqProvider")
  return context
}
