import { useEffect, useState } from "react"
import { GripVertical, Plus, PowerOff, RotateCcw, X } from "lucide-react"
import { useRfq, type RfqProduct } from "../../Contexts/rfqContext"

type ProductManagementModalProps = {
  clientId: number
  clientName: string
  onClose: () => void
}

const ProductManagementModal = ({ clientId, clientName, onClose }: ProductManagementModalProps) => {
  const { getAllClientProducts, addProduct, reorderProducts, deactivateProduct, activateProduct } = useRfq()
  const [products, setProducts] = useState<RfqProduct[]>([])
  const [newProductName, setNewProductName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pendingProductId, setPendingProductId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState("")

  const refreshProducts = async () => {
    const nextProducts = await getAllClientProducts(clientId)
    setProducts(nextProducts)
  }

  useEffect(() => {
    let isCancelled = false
    void getAllClientProducts(clientId)
      .then((nextProducts) => {
        if (!isCancelled) setProducts(nextProducts)
      })
      .catch((loadError) => {
        if (!isCancelled) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les produits.")
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => {
      isCancelled = true
      window.removeEventListener("keydown", handleEscape)
    }
  }, [clientId, getAllClientProducts, onClose])

  const handleAdd = async () => {
    const name = newProductName.trim()
    if (!name) {
      setError("Indiquez le nom du produit.")
      return
    }

    setIsAdding(true)
    setError("")
    try {
      await addProduct(clientId, name)
      await refreshProducts()
      setNewProductName("")
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Impossible d’ajouter le produit.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleProduct = async (product: RfqProduct) => {
    if (product.is_active && !window.confirm(`Désactiver « ${product.name} »? Son historique RFQ sera conservé.`)) return

    setPendingProductId(product.id)
    setError("")
    try {
      if (product.is_active) {
        await deactivateProduct(clientId, product.id)
      } else {
        await activateProduct(clientId, product.id)
      }
      await refreshProducts()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Impossible de modifier le produit.")
    } finally {
      setPendingProductId(null)
    }
  }

  const handleReorder = async (productIds: number[]) => {
    const productById = new Map(products.map((product) => [product.id, product]))
    const reorderedActiveProducts = productIds
      .map((id, index) => {
        const product = productById.get(id)
        return product ? { ...product, display_order: index + 1 } : null
      })
      .filter((product): product is RfqProduct => product !== null)
    setProducts([...reorderedActiveProducts, ...products.filter((product) => !product.is_active)])
    setError("")
    try {
      await reorderProducts(clientId, productIds)
      await refreshProducts()
    } catch (actionError) {
      await refreshProducts()
      setError(actionError instanceof Error ? actionError.message : "Impossible de réorganiser les produits.")
    }
  }

  const activeProducts = products.filter((product) => product.is_active)
  const inactiveProducts = products.filter((product) => !product.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <div aria-labelledby="product-management-title" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-secondary" id="product-management-title">Gérer les produits</h3>
            <p className="text-2xl font-bold ">{clientName}</p>
          </div>
          <button aria-label="Fermer" className="cursor-pointer rounded p-1 hover:bg-gray-100" onClick={onClose} type="button"><X /></button>
        </div>

        <form className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4" onSubmit={(event) => { event.preventDefault(); void handleAdd() }}>
          <label className="text-sm font-bold" htmlFor="managed-product-name">Ajouter un produit</label>
          <div className="mt-1 flex gap-2">
            <input className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2" disabled={isAdding} id="managed-product-name" maxLength={150} onChange={(event) => setNewProductName(event.target.value)} placeholder="Nom du produit" value={newProductName} />
            <button className="inline-flex cursor-pointer items-center gap-2 rounded bg-secondary px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isAdding} type="submit">
              <Plus size={18} /> {isAdding ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>

        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-600">Chargement des produits…</p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ProductList title={`Actifs (${activeProducts.length})`} products={activeProducts} pendingProductId={pendingProductId} onReorder={handleReorder} onToggle={handleToggleProduct} />
            <ProductList inactive title={`Désactivés (${inactiveProducts.length})`} products={inactiveProducts} pendingProductId={pendingProductId} onToggle={handleToggleProduct} />
          </div>
        )}
      </div>
    </div>
  )
}

type ProductListProps = {
  title: string
  products: RfqProduct[]
  inactive?: boolean
  pendingProductId: number | null
  onReorder?: (productIds: number[]) => Promise<void>
  onToggle: (product: RfqProduct) => Promise<void>
}

const ProductList = ({ title, products, inactive = false, pendingProductId, onReorder, onToggle }: ProductListProps) => {
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null)
  const [dropProductId, setDropProductId] = useState<number | null>(null)

  const dropProduct = (targetProductId: number) => {
    if (draggedProductId === null || draggedProductId === targetProductId || !onReorder) {
      setDraggedProductId(null)
      setDropProductId(null)
      return
    }
    const nextIds = products.map((product) => product.id)
    const sourceIndex = nextIds.indexOf(draggedProductId)
    const targetIndex = nextIds.indexOf(targetProductId)
    nextIds.splice(targetIndex, 0, nextIds.splice(sourceIndex, 1)[0])
    setDraggedProductId(null)
    setDropProductId(null)
    void onReorder(nextIds)
  }

  return (
  <section>
    <h4 className="border-b border-gray-200 pb-2 font-bold">{title}</h4>
    {!inactive && products.length > 1 && (
      <p className="mt-2 text-xs text-gray-500">Glissez les produits pour modifier leur ordre dans le calendrier.</p>
    )}
    {products.length ? (
      <div className="mt-2 space-y-2">
        {products.map((product) => (
          <div
            className={`flex items-center justify-between gap-3 rounded border px-3 py-2 transition ${inactive ? "border-gray-200 bg-gray-50 text-gray-600" : "cursor-grab border-green-200 bg-green-50 active:cursor-grabbing"} ${dropProductId === product.id ? "outline-3 outline-offset-2 outline-secondary" : ""} ${draggedProductId === product.id ? "opacity-50" : ""}`}
            draggable={!inactive && pendingProductId === null}
            key={product.id}
            onDragEnd={() => {
              setDraggedProductId(null)
              setDropProductId(null)
            }}
            onDragEnter={(event) => {
              if (inactive || draggedProductId === null) return
              event.preventDefault()
              setDropProductId(product.id)
            }}
            onDragOver={(event) => {
              if (inactive || draggedProductId === null) return
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
            }}
            onDragStart={(event) => {
              if (inactive) {
                event.preventDefault()
                return
              }
              setDraggedProductId(product.id)
              event.dataTransfer.effectAllowed = "move"
              event.dataTransfer.setData("text/plain", String(product.id))
            }}
            onDrop={(event) => {
              event.preventDefault()
              dropProduct(product.id)
            }}
          >
            {!inactive && <GripVertical aria-hidden="true" className="shrink-0 text-gray-500" size={18} />}
            <span className="min-w-0 wrap-break-word font-medium">{product.name}</span>
            <button className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${inactive ? "border border-secondary bg-white text-secondary hover:bg-secondary/10" : "border border-red-300 bg-white text-red-700 hover:bg-red-50"}`} disabled={pendingProductId !== null} onClick={() => void onToggle(product)} type="button">
              {inactive ? <><RotateCcw size={14} /> Réactiver</> : <><PowerOff size={14} /> Désactiver</>}
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="mt-3 text-sm text-gray-500">Aucun produit.</p>
    )}
  </section>
  )
}

export default ProductManagementModal
