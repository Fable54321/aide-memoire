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
  is_active: boolean
}

export type RfqCell = {
  id: number
  client_id: number
  product_id: number
  week_start: string
  location_code: string
  status: "final" | "email"
  prices: Array<{ id: number; quantity: number | string; price: number | string }>
  attachments: Array<{ id: number; file_name: string; content_type: string }>
  email_links: Array<{
    id: number
    user_id: number
    owner_username: string
    subject: string
    sender_name: string
    sender_email: string
    received_at: string | null
  }>
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
  getAllClientProducts: (clientId: number) => Promise<RfqProduct[]>
  addProduct: (clientId: number, name: string) => Promise<void>
  reorderProducts: (clientId: number, productIds: number[]) => Promise<void>
  deactivateProduct: (clientId: number, productId: number) => Promise<void>
  activateProduct: (clientId: number, productId: number) => Promise<void>
  cellsByClient: Record<number, RfqCell[]>
  loadClientCells: (clientId: number) => Promise<void>
  saveCell: (data: { clientId: number; productId: number; weekStart: string; locationCode: string; status: "final" | "email"; prices: Array<{ quantity: number; price: number }>; files: File[]; outlookMessageIds: string[] }) => Promise<void>
  moveCell: (data: { cellId: number; clientId: number; productId: number; weekStart: string; locationCode: string }) => Promise<void>
  moveCells: (data: { clientId: number; moves: Array<{ cellId: number; weekStart: string; locationCode: string }> }) => Promise<void>
  deleteCell: (cellId: number, clientId: number) => Promise<void>
  getAttachmentUrl: (attachmentId: number) => Promise<string>
  openAttachment: (attachmentId: number) => Promise<void>
  openOutlookLink: (linkId: number) => Promise<void>
}

const RfqContext = createContext<RfqContextType | undefined>(undefined)

export const RfqProvider = ({ children }: { children: ReactNode }) => {
  const [productsByClient, setProductsByClient] = useState<Record<number, RfqProduct[]>>({})
  const [loadingByClient, setLoadingByClient] = useState<Record<number, boolean>>({})
  const [errorsByClient, setErrorsByClient] = useState<Record<number, string | null>>({})
  const [cellsByClient, setCellsByClient] = useState<Record<number, RfqCell[]>>({})

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

  const addProduct: RfqContextType["addProduct"] = useCallback(async (clientId, name) => {
    await fetchWithAuth(`/sales/clients/${clientId}/products`, {
      method: "POST",
      body: { name },
    })
    await loadClientProducts(clientId)
  }, [loadClientProducts])

  const getAllClientProducts: RfqContextType["getAllClientProducts"] = useCallback(async (clientId) => {
    const response = await fetchWithAuth<ClientProductsResponse>(
      `/sales/clients/${clientId}/products?includeInactive=true`,
    )
    return response.products
  }, [])

  const reorderProducts: RfqContextType["reorderProducts"] = useCallback(async (clientId, productIds) => {
    await fetchWithAuth(`/sales/clients/${clientId}/products/reorder`, {
      method: "PATCH",
      body: { productIds },
    })
    await loadClientProducts(clientId)
  }, [loadClientProducts])

  const deactivateProduct: RfqContextType["deactivateProduct"] = useCallback(async (clientId, productId) => {
    await fetchWithAuth(`/sales/clients/${clientId}/products/${productId}/deactivate`, {
      method: "PATCH",
    })
    await loadClientProducts(clientId)
  }, [loadClientProducts])

  const activateProduct: RfqContextType["activateProduct"] = useCallback(async (clientId, productId) => {
    await fetchWithAuth(`/sales/clients/${clientId}/products/${productId}/activate`, {
      method: "PATCH",
    })
    await loadClientProducts(clientId)
  }, [loadClientProducts])

  const loadClientCells = useCallback(async (clientId: number) => {
    const response = await fetchWithAuth<{ cells: RfqCell[] }>(`/sales/clients/${clientId}/rfq-cells`)
    setCellsByClient((current) => ({ ...current, [clientId]: response.cells }))
  }, [])

  const saveCell: RfqContextType["saveCell"] = useCallback(async (data) => {
    const body = new FormData()
    body.append("clientId", String(data.clientId))
    body.append("productId", String(data.productId))
    body.append("weekStart", data.weekStart)
    body.append("locationCode", data.locationCode)
    body.append("status", data.status)
    body.append("prices", JSON.stringify(data.prices))
    body.append("outlookMessageIds", JSON.stringify(data.outlookMessageIds))
    data.files.forEach((file) => body.append("files", file))
    await fetchWithAuth("/sales/rfq-cells", { method: "PUT", body })
    await loadClientCells(data.clientId)
  }, [loadClientCells])

  const deleteCell: RfqContextType["deleteCell"] = useCallback(async (cellId, clientId) => {
    await fetchWithAuth(`/sales/rfq-cells/${cellId}`, { method: "DELETE" })
    await loadClientCells(clientId)
  }, [loadClientCells])

  const moveCell: RfqContextType["moveCell"] = useCallback(async (data) => {
    await fetchWithAuth(`/sales/rfq-cells/${data.cellId}/move`, {
      method: "PATCH",
      body: {
        clientId: data.clientId,
        productId: data.productId,
        weekStart: data.weekStart,
        locationCode: data.locationCode,
      },
    })
    await loadClientCells(data.clientId)
  }, [loadClientCells])

  const moveCells: RfqContextType["moveCells"] = useCallback(async (data) => {
    await fetchWithAuth("/sales/rfq-cells/move-batch", {
      method: "PATCH",
      body: data,
    })
    await loadClientCells(data.clientId)
  }, [loadClientCells])

  const getAttachmentUrl = useCallback(async (attachmentId: number) => {
    const { url } = await fetchWithAuth<{ url: string }>(`/sales/rfq-attachments/${attachmentId}`)
    return url
  }, [])

  const openAttachment = useCallback(async (attachmentId: number) => {
    const url = await getAttachmentUrl(attachmentId)
    window.open(url, "_blank", "noopener,noreferrer")
  }, [getAttachmentUrl])

  const openOutlookLink = useCallback(async (linkId: number) => {
    const outlookWindow = window.open("about:blank", "_blank")
    try {
      const { url } = await fetchWithAuth<{ url: string }>(`/sales/outlook-links/${linkId}/open`)
      if (outlookWindow) {
        outlookWindow.opener = null
        outlookWindow.location.replace(url)
      } else {
        window.location.assign(url)
      }
    } catch (error) {
      outlookWindow?.close()
      throw error
    }
  }, [])

  useEffect(() => {
    rfqSuppliers.forEach(({ id }) => {
      void loadClientProducts(id)
      void loadClientCells(id)
    })
  }, [loadClientProducts, loadClientCells])

  return (
    <RfqContext.Provider
      value={{ productsByClient, loadingByClient, errorsByClient, loadClientProducts, getAllClientProducts, addProduct, reorderProducts, deactivateProduct, activateProduct, cellsByClient, loadClientCells, saveCell, moveCell, moveCells, deleteCell, getAttachmentUrl, openAttachment, openOutlookLink }}
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
