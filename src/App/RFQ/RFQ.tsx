import { useCallback, useEffect, useState, type ClipboardEvent } from "react"
import { ArrowLeft, ArrowRight, ExternalLink, FileText, Mail, Settings, Trash2, X } from "lucide-react"
import { rfqSuppliers } from "../ClientsAndVegetables/suppliers"
import { useRfq } from "../../Contexts/rfqContext"
import {
  getRfqClientConfig,
  type RfqSupplier,
  type SelectedRfqCell,
} from "../../Utils/rfqUtils"
import AttachmentPreviewModal from "./AttachmentPreviewModal"
import ProductManagementModal from "./ProductManagementModal"
import Calendar from "./Components/Calendar"
import AttachmentDropZone from "./Components/AttachmentDropZone"
import OutlookMessagePicker, { type OutlookMessage } from "./Components/OutlookMessagePicker"
import { useAuth } from "../../Contexts/AuthContext"

// TODO: Set to true once Microsoft Graph admin consent has been granted.
const MICROSOFT_GRAPH_ENABLED = false

const getAttachmentDisplayName = (fileName: string, contentType: string) => {
  if (contentType.startsWith("image/")) {
    if (fileName.toLowerCase().startsWith("capture d")) return "Capture d’écran"
    return fileName.replace(/\.[^.]+$/, "")
  }
  return fileName
}

const RFQ = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<RfqSupplier>(rfqSuppliers[0])
  const { cellsByClient, saveCell, deleteCell, openAttachment, openOutlookLink } = useRfq()
  const { user } = useAuth()
  const [selectedCell, setSelectedCell] = useState<SelectedRfqCell | null>(null)
  const [priceRows, setPriceRows] = useState(["20"])
  const [isEditingPrice, setIsEditingPrice] = useState(true)
  const [cellStatus, setCellStatus] = useState<"final" | "email">("email")
  const [files, setFiles] = useState<File[]>([])
  const [selectedOutlookMessages, setSelectedOutlookMessages] = useState<OutlookMessage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [allowSaveWithoutPrice, setAllowSaveWithoutPrice] = useState(false)
  const [isManagingProducts, setIsManagingProducts] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<{ id: number; fileName: string } | null>(null)
  const { clientAccentColor, managementLabel } = getRfqClientConfig(selectedSupplier.id)
  const savedCells = cellsByClient[selectedSupplier.id] ?? []
  const activeSavedCell = selectedCell ? savedCells.find((cell) =>
    cell.product_id === selectedCell.productId && cell.week_start === selectedCell.weekStart && cell.location_code === selectedCell.locationCode,
  ) : undefined
  const closeProductManagement = useCallback(() => setIsManagingProducts(false), [])
  const closeAttachmentPreview = useCallback(() => setPreviewAttachment(null), [])

  const adjustPrice = (index: number, amount: number) => {
    setPriceRows((current) => current.map((item, rowIndex) => {
      if (rowIndex !== index) return item
      return String(Math.max(0, (Number(item.replace(",", ".")) || 0) + amount))
    }))
    setAllowSaveWithoutPrice(false)
  }

  const addFiles = (incomingFiles: File[]) => {
    setFiles((currentFiles) => {
      const knownFiles = new Set(
        currentFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
      )
      return [
        ...currentFiles,
        ...incomingFiles.filter(
          (file) => !knownFiles.has(`${file.name}:${file.size}:${file.lastModified}`),
        ),
      ]
    })
  }

  const openCell = (cellSelection: SelectedRfqCell) => {
    const cell = savedCells.find((item) =>
      item.product_id === cellSelection.productId && item.week_start === cellSelection.weekStart && item.location_code === cellSelection.locationCode,
    )
    setPriceRows(cell?.prices.length ? cell.prices.map((item) => String(item.price)) : ["20"])
    setIsEditingPrice(!cell?.prices.length)
    setCellStatus(cell?.status ?? "email")
    setFiles([])
    setSelectedOutlookMessages([])
    setSaveError("")
    setAllowSaveWithoutPrice(false)
    setSelectedCell(cellSelection)
  }

  useEffect(() => {
    if (!selectedCell) return
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (previewAttachment) return
      if (event.key === "Escape") {
        setSelectedCell(null)
      } else if (isEditingPrice && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault()
        const amount = event.key === "ArrowLeft" ? -1 : 1
        setPriceRows((current) => current.map((item, index) =>
          index === 0 ? String(Math.max(0, (Number(item.replace(",", ".")) || 0) + amount)) : item,
        ))
        setAllowSaveWithoutPrice(false)
      }
    }
    window.addEventListener("keydown", handleDialogKeyDown)
    return () => window.removeEventListener("keydown", handleDialogKeyDown)
  }, [isEditingPrice, previewAttachment, selectedCell])

  const handleSave = async () => {
    if (!selectedCell) return
    const parsedPrices = priceRows.filter((row) => row.trim()).map((row) => ({
      quantity: 1,
      price: Number(row.trim().replace(",", ".")),
    }))
    if (parsedPrices.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0 || !Number.isFinite(row.price) || row.price < 0)) {
      setSaveError("Indiquez un montant valide (ex. 25).")
      return
    }
    if (!parsedPrices.length && !allowSaveWithoutPrice) {
      setSaveError("")
      setAllowSaveWithoutPrice(true)
      return
    }
    setIsSaving(true)
    setSaveError("")
    try {
      await saveCell({
        clientId: selectedSupplier.id,
        productId: selectedCell.productId,
        weekStart: selectedCell.weekStart,
        locationCode: selectedCell.locationCode,
        status: cellStatus,
        prices: parsedPrices,
        files,
        outlookMessageIds: selectedOutlookMessages.map((message) => message.id),
      })
      setSelectedCell(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer.")
    } finally { setIsSaving(false) }
  }

  const handleImagePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedImages = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
      .map((file) => {
        const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png"
        return new File([file], `Capture d'ecran.${extension}`, {
          type: file.type,
          lastModified: Date.now(),
        })
      })

    if (!pastedImages.length) return

    event.preventDefault()
    addFiles(pastedImages)
  }

  const handleDelete = async () => {
    if (!activeSavedCell || !window.confirm("Supprimer définitivement cette entrée RFQ?")) return

    setIsDeleting(true)
    setSaveError("")
    try {
      await deleteCell(activeSavedCell.id, selectedSupplier.id)
      setSelectedCell(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Impossible de supprimer l’entrée.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="mt-8 w-[min(1080px,calc(100%-1.5rem))] lg:w-[min(1440px,calc(100%-2rem))]">
      <div className="text-center">
        <h2 className="text-2xl font-bold">RFQ</h2>
        <p className="mt-2 text-gray-600">Sélectionnez un client pour consulter ses RFQ.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Clients RFQ">
        {rfqSuppliers.map((supplier) => {
          const isSelected = selectedSupplier.id === supplier.id

          return (
            <button
              aria-pressed={isSelected}
              className={`flex min-h-24 items-center justify-center rounded-lg border-2 cursor-pointer bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                isSelected ? "border-secondary ring-2 ring-primary/40" : "border-gray-200"
              }`}
              key={supplier.id}
              onClick={() => {
                setSelectedSupplier(supplier)
              }}
              type="button"
            >
              <img className="max-h-12 max-w-full" src={supplier.logo} alt={supplier.name} />
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-lg border-2 border-secondary bg-white p-3 shadow-md sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className={`text-xl font-bold uppercase ${clientAccentColor}`}>
              {selectedSupplier.name}
            </h3>
            <p className={`text-sm font-bold ${clientAccentColor}`}>RFQ complétés</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold" aria-label="Légende des prix">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-sm bg-primary" aria-hidden="true" />
                Prix final
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-sm bg-[#4C1CC6]" aria-hidden="true" />
                Prix par courriel
              </span>
            </div>
            <button className="inline-flex cursor-pointer items-center gap-2 rounded border border-secondary px-4 py-2 text-sm font-bold text-secondary transition hover:bg-secondary/10" onClick={() => setIsManagingProducts(true)} type="button">
              <Settings size={18} /> {managementLabel}
            </button>
          </div>
        </div>

        <Calendar onOpenCell={openCell} selectedSupplier={selectedSupplier} />
      </div>

      {isManagingProducts && (
        <ProductManagementModal
          clientId={selectedSupplier.id}
          clientName={selectedSupplier.name}
          onClose={closeProductManagement}
        />
      )}

      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedCell(null)} role="presentation">
          <div aria-labelledby="rfq-dialog-title" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl" onPaste={handleImagePaste} role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-secondary" id="rfq-dialog-title">{selectedCell.productName}</h3>
                <p className="mt-1 text-sm font-bold uppercase text-gray-800">{selectedSupplier.name}</p>
                <p className="text-sm text-gray-600">{selectedCell.weekLabel} · {selectedCell.locationName}</p>
              </div>
              <button aria-label="Fermer" className="cursor-pointer rounded p-1 hover:bg-gray-100" onClick={() => setSelectedCell(null)} type="button"><X /></button>
            </div>

            <div className="mt-5 space-y-3">
              <fieldset className="mb-5">
                <legend className="mb-2 text-sm font-bold">État du prix</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${cellStatus === "final" ? "border-secondary bg-secondary/10" : "border-gray-300"}`}>
                    <input checked={cellStatus === "final"} name="rfq-status" onChange={() => setCellStatus("final")} type="radio" />
                    <span><strong>X — Prix final</strong><span className="block text-xs text-gray-600">RFQ complété</span></span>
                  </label>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${cellStatus === "email" ? "border-secondary bg-secondary/10" : "border-gray-300"}`}>
                    <input checked={cellStatus === "email"} name="rfq-status" onChange={() => setCellStatus("email")} type="radio" />
                    <span><strong>C — Courriel</strong><span className="block text-xs text-gray-600">Prix communiqué par courriel</span></span>
                  </label>
                </div>
              </fieldset>
              <div className="flex flex-col">

              <div className="text-sm font-bold"><span className="text-[1.2rem]">PRIX</span>($) par <span className="text-[1.2rem]">QTÉ</span>(boîtes, palettes etc ...)</div>
              (Appuyer sur entrée pour enregistrer)
              </div>
              {(activeSavedCell?.prices.length ?? 0) > 0 && !isEditingPrice ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
                  <span className="text-lg font-bold text-green-900">{priceRows[0]} $</span>
                  <button className="cursor-pointer rounded border border-green-700 bg-white px-3 py-1.5 text-sm font-bold text-green-800 transition hover:bg-green-100" onClick={() => setIsEditingPrice(true)} type="button">
                    Modifier
                  </button>
                </div>
              ) : (
                <div>
                  {priceRows.map((row, index) => (
                    <div className="flex items-center justify-center gap-2" key={index}>
                      <button aria-label="Diminuer le prix de 1" className="cursor-pointer rounded-full p-2 text-green-700 transition hover:bg-green-100" onClick={() => adjustPrice(index, -1)} type="button">
                        <ArrowLeft aria-hidden="true" size={22} strokeWidth={3} />
                      </button>
                      <input aria-label={`Prix/Qté ${index + 1}`} autoFocus={index === 0} className="w-32 rounded border border-gray-300 px-3 py-2 text-center" inputMode="decimal" onChange={(event) => { setPriceRows((current) => current.map((item, rowIndex) => rowIndex === index ? event.target.value : item)); setAllowSaveWithoutPrice(false) }} onFocus={(event) => event.currentTarget.select()} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSave() } }} placeholder="ex. 25" value={row} />
                      <button aria-label="Augmenter le prix de 1" className="cursor-pointer rounded-full p-2 text-green-700 transition hover:bg-green-100" onClick={() => adjustPrice(index, 1)} type="button">
                        <ArrowRight aria-hidden="true" size={22} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  <p className="mt-1 text-center text-xs text-gray-500">Utilisez les flèches ← et → pour ajuster le prix de −1 ou +1.</p>
                </div>
              )}
            </div>

            {MICROSOFT_GRAPH_ENABLED && (
              <div className="mt-6 border-t pt-4">
                <p className="text-sm font-bold">Courriel Outlook lié</p>
                <OutlookMessagePicker
                  onChange={setSelectedOutlookMessages}
                  selectedMessages={selectedOutlookMessages}
                />
                {(activeSavedCell?.email_links.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-gray-700">Courriels déjà liés</p>
                    {activeSavedCell?.email_links.map((emailLink) => {
                      const canOpen = emailLink.user_id === user?.id
                      return (
                        <button
                          className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canOpen}
                          key={emailLink.id}
                          onClick={() => void openOutlookLink(emailLink.id)}
                          title={canOpen ? "Ouvrir dans Outlook" : `Lié par ${emailLink.owner_username}`}
                          type="button"
                        >
                          <Mail className="shrink-0 text-blue-700" size={20} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{emailLink.subject}</span>
                            <span className="block truncate text-xs text-gray-600">
                              {emailLink.sender_name || emailLink.sender_email}
                              {!canOpen && ` · Lié par ${emailLink.owner_username}`}
                            </span>
                          </span>
                          {canOpen && <ExternalLink className="shrink-0 text-blue-700" size={17} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-bold">Courriel, capture d’écran ou document</p>
              <p className="mt-1 text-xs text-gray-600">Glissez un courriel Outlook, ou collez une image avec Ctrl+V.</p>
              <div
                aria-label="Zone de collage d’image"
                className="mt-2 min-h-14 cursor-text rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-sm text-gray-600 outline-none transition focus:border-secondary focus:bg-secondary/5"
                contentEditable
                onInput={(event) => { event.currentTarget.textContent = "Clic droit ici, puis Coller" }}
                role="textbox"
                suppressContentEditableWarning
              >
                Clic droit ici, puis Coller
              </div>
              <AttachmentDropZone
                files={files}
                getDisplayName={getAttachmentDisplayName}
                onAddFiles={addFiles}
                onRemoveFile={(index) => setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))}
              />
              {(activeSavedCell?.attachments.length ?? 0) > 0 && <div className="mt-3 space-y-1">{activeSavedCell?.attachments.map((attachment) => (
                <button className="flex cursor-pointer items-center gap-2 text-left text-sm text-secondary underline" key={attachment.id} onClick={() => attachment.content_type.startsWith("image/") ? setPreviewAttachment({ id: attachment.id, fileName: getAttachmentDisplayName(attachment.file_name, attachment.content_type) }) : void openAttachment(attachment.id)} type="button"><FileText size={16} />{getAttachmentDisplayName(attachment.file_name, attachment.content_type)}</button>
              ))}</div>}
            </div>

            {saveError && <p className="mt-4 text-sm text-red-700" role="alert">{saveError}</p>}
            {allowSaveWithoutPrice && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                Aucun prix n’est indiqué. Enregistrer sans prix ?
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                {activeSavedCell && (
                  <button className="inline-flex cursor-pointer items-center gap-2 rounded border border-red-600 px-4 py-2 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={isDeleting || isSaving} onClick={() => void handleDelete()} type="button">
                    <Trash2 size={17} /> {isDeleting ? "Suppression…" : "Supprimer"}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button className="cursor-pointer rounded border border-gray-300 px-4 py-2" disabled={isDeleting} onClick={() => setSelectedCell(null)} type="button">Annuler</button>
                <button className="cursor-pointer rounded bg-secondary px-5 py-2 font-bold text-white disabled:opacity-50" disabled={isSaving || isDeleting} onClick={() => void handleSave()} type="button">{isSaving ? "Enregistrement…" : allowSaveWithoutPrice ? "Enregistrer sans prix" : "Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={closeAttachmentPreview} />
      )}
    </section>
  )
}

export default RFQ
