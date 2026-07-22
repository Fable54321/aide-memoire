import { useEffect, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { rfqSuppliers } from "../ClientsAndVegetables/suppliers"
import { useRfq } from "../../Contexts/rfqContext"

type RfqSupplier = (typeof rfqSuppliers)[number]

const loblawsLocations = [
  { code: "B", name: "Boucherville" },
  { code: "C", name: "Caledonia (maritime)" },
  { code: "M", name: "Maplegrove (Ontario)" },
  { code: "W", name: "Ouest canadien" },
] as const

const metroLocations = [
  { code: "M", name: "Montréal (ZP 01)" },
  { code: "T", name: "Toronto (ZP 03)" },
] as const

const sobeysLocations = [
  { code: "B", name: "Boucherville" },
  { code: "Q", name: "Québec" },
  { code: "O", name: "Ontario", details: ["Debert", "Witby"] },
  { code: "W", name: "Ouest canadien", details: ["Campbell", "Winnipeg", "Calgary", "Edmonton"] },
  { code: "A", name: "Atlantique", details: ["Mt-Pearl"] },
] as const

const monthNames = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
]

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getMonday = (date: Date) => {
  const day = date.getDay() || 7
  return addDays(date, 1 - day)
}

const getIsoWeek = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const formatWeekRange = (start: Date, end: Date) => {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} au ${end.getDate()} ${monthNames[end.getMonth()]}`
  }

  return `${start.getDate()} ${monthNames[start.getMonth()]} au ${end.getDate()} ${monthNames[end.getMonth()]}`
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

type SelectedCell = {
  productId: number
  productName: string
  weekStart: string
  weekLabel: string
  locationCode: string
  locationName: string
}

const RFQ = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<RfqSupplier>(rfqSuppliers[0])
  const { productsByClient, loadingByClient, errorsByClient, loadClientProducts, cellsByClient, saveCell, openAttachment } = useRfq()
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [priceRows, setPriceRows] = useState([{ quantity: "", price: "" }])
  const [cellStatus, setCellStatus] = useState<"final" | "email">("email")
  const [files, setFiles] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const products = productsByClient[selectedSupplier.id] ?? []
  const isLoading = loadingByClient[selectedSupplier.id]
  const error = errorsByClient[selectedSupplier.id]
  const isMetro = selectedSupplier.id === 4
  const isSobeys = selectedSupplier.id === 5
  const locations = isMetro
    ? metroLocations
    : isSobeys
      ? sobeysLocations
      : loblawsLocations
  const weeks = Array.from({ length: isMetro ? 12 : isSobeys ? 6 : 8 }, (_, index) => {
    const start = addDays(getMonday(new Date()), index * 7)
    const end = addDays(start, 6)
    return {
      start: formatDateKey(start),
      number: getIsoWeek(start),
      title: isSobeys
        ? `SF ${addDays(end, 4).getDate()} ${monthNames[addDays(end, 4).getMonth()]}`
        : isMetro
          ? null
          : `SE ${getIsoWeek(start)}`,
      label: isMetro
        ? `${start.getDate()} ${monthNames[start.getMonth()]}`
        : formatWeekRange(start, end),
    }
  })
  const alternateWeekColor = isMetro
    ? "bg-orange-100"
    : isSobeys
      ? "bg-fuchsia-100"
      : "bg-green-100"
  const clientAccentColor = isSobeys ? "text-fuchsia-800" : "text-secondary"
  const savedCells = cellsByClient[selectedSupplier.id] ?? []
  const activeSavedCell = selectedCell ? savedCells.find((cell) =>
    cell.product_id === selectedCell.productId && cell.week_start === selectedCell.weekStart && cell.location_code === selectedCell.locationCode,
  ) : undefined

  const openCell = (cellSelection: SelectedCell) => {
    const cell = savedCells.find((item) =>
      item.product_id === cellSelection.productId && item.week_start === cellSelection.weekStart && item.location_code === cellSelection.locationCode,
    )
    setPriceRows(cell?.prices.length ? cell.prices.map((item) => ({ quantity: String(item.quantity), price: String(item.price) })) : [{ quantity: "", price: "" }])
    setCellStatus(cell?.status ?? "email")
    setFiles([])
    setSaveError("")
    setSelectedCell(cellSelection)
  }

  useEffect(() => {
    if (!selectedCell) return
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedCell(null)
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [selectedCell])

  const handleSave = async () => {
    if (!selectedCell) return
    const parsedPrices = priceRows.filter((row) => row.quantity || row.price).map((row) => ({
      quantity: Number(row.quantity.replace(",", ".")),
      price: Number(row.price.replace(",", ".")),
    }))
    if (!parsedPrices.length || parsedPrices.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0 || !Number.isFinite(row.price) || row.price < 0)) {
      setSaveError("Indiquez une quantité et un prix valides pour chaque ligne.")
      return
    }
    setIsSaving(true)
    setSaveError("")
    try {
      await saveCell({ clientId: selectedSupplier.id, productId: selectedCell.productId, weekStart: selectedCell.weekStart, locationCode: selectedCell.locationCode, status: cellStatus, prices: parsedPrices, files })
      setSelectedCell(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer.")
    } finally { setIsSaving(false) }
  }

  return (
    <section className="mt-8 w-[min(1080px,calc(100%-1.5rem))]">
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
              onClick={() => setSelectedSupplier(supplier)}
              type="button"
            >
              <img className="max-h-12 max-w-full" src={supplier.logo} alt={supplier.name} />
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-lg border-2 border-secondary bg-white p-3 shadow-md sm:p-5">
        <div className="mb-4">
          <h3 className={`text-xl font-bold uppercase ${clientAccentColor}`}>
            {selectedSupplier.name}
          </h3>
          <p className={`text-sm font-bold ${clientAccentColor}`}>RFQ complétés</p>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-600">Chargement des produits...</p>
        ) : error ? (
          <div className="py-8 text-center text-sm">
            <p className="text-red-700" role="alert">{error}</p>
            <button
              className="mt-3 cursor-pointer font-bold text-secondary underline"
              onClick={() => void loadClientProducts(selectedSupplier.id)}
              type="button"
            >
              Réessayer
            </button>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="overflow-x-auto pb-2">
              <table className="w-max min-w-full table-fixed border-collapse text-sm text-black">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-56 min-w-56 bg-white" rowSpan={2}>
                      <span className="sr-only">Produits</span>
                    </th>
                    {weeks.map((week, weekIndex) => (
                      <th
                        className={`border-2 border-black px-1 py-2 text-center ${
                          weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                        }`}
                        colSpan={locations.length}
                        key={`${week.number}-${weekIndex}`}
                        scope="colgroup"
                      >
                        {week.title && (
                          <span className="block text-base font-extrabold">{week.title}</span>
                        )}
                        <span
                          className={`block whitespace-nowrap font-bold ${isMetro ? "text-xs" : "text-[10px]"}`}
                        >
                          {week.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {weeks.flatMap((week, weekIndex) =>
                      locations.map((location, locationIndex) => (
                        <th
                          className={`h-6 w-6 min-w-6 border-y-2 border-black text-center font-extrabold ${
                            locationIndex === 0 ? "border-l-2" : "border-l border-l-black/60"
                          } ${locationIndex === locations.length - 1 ? "border-r-2" : ""} ${
                            weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                          }`}
                          key={`${week.number}-${weekIndex}-${location.code}`}
                          scope="col"
                          title={location.name}
                        >
                          {location.code}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <th
                        className={`sticky left-0 z-10 h-6 w-56 min-w-56 border border-black bg-white px-2 text-left font-normal ${
                          isSobeys ? "text-fuchsia-800" : ""
                        }`}
                        scope="row"
                      >
                        {product.name}
                      </th>
                      {weeks.flatMap((week, weekIndex) =>
                        locations.map((location, locationIndex) => (
                          <td
                            aria-label={`${product.name}, semaine ${week.number}, ${location.name}`}
                            className={`h-6 w-6 min-w-6 border-y border-black/60 ${
                              locationIndex === 0 ? "border-l-2 border-l-black" : "border-l border-l-black/40"
                            } ${locationIndex === locations.length - 1 ? "border-r-2 border-r-black" : ""} ${
                              weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                            }`}
                            key={`${product.id}-${week.number}-${weekIndex}-${location.code}`}
                          >
                            <button
                              className={`h-full min-h-6 w-full cursor-pointer transition hover:bg-primary/35 focus:outline-2 focus:outline-secondary ${
                                savedCells.some((cell) => cell.product_id === product.id && cell.week_start === week.start && cell.location_code === location.code) ? "bg-secondary/35" : ""
                              }`}
                              onClick={() => openCell({ productId: product.id, productName: product.name, weekStart: week.start, weekLabel: week.label, locationCode: location.code, locationName: location.name })}
                              title={`Modifier ${product.name}, ${week.label}, ${location.name}`}
                              type="button"
                            >
                              <span aria-hidden="true" className="font-black leading-none">
                                {savedCells.find((cell) => cell.product_id === product.id && cell.week_start === week.start && cell.location_code === location.code)?.status === "final" ? "X" :
                                  savedCells.find((cell) => cell.product_id === product.id && cell.week_start === week.start && cell.location_code === location.code)?.status === "email" ? "C" : ""}
                              </span>
                              <span className="sr-only">Modifier cette case</span>
                            </button>
                          </td>
                        )),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className={`mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 ${
                locations.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
              }`}
            >
              {locations.map((location) => (
                <div key={location.code}>
                  <p><strong>{location.code}</strong> = {location.name}</p>
                  {"details" in location && location.details?.map((detail) => (
                    <p className="pl-4" key={detail}>{detail}</p>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-gray-600">
            Aucun produit actif pour {selectedSupplier.name}.
          </p>
        )}
      </div>

      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedCell(null)} role="presentation">
          <div aria-labelledby="rfq-dialog-title" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-secondary" id="rfq-dialog-title">{selectedCell.productName}</h3>
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
              <div className="grid grid-cols-2 gap-2 text-sm font-bold"><span>Quantité</span><span>Prix</span></div>
              {priceRows.map((row, index) => (
                <div className="grid grid-cols-2 gap-2" key={index}>
                  <input aria-label={`Quantité ${index + 1}`} className="rounded border border-gray-300 px-3 py-2" inputMode="decimal" onChange={(event) => setPriceRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, quantity: event.target.value } : item))} placeholder="ex. 100" value={row.quantity} />
                  <input aria-label={`Prix ${index + 1}`} className="rounded border border-gray-300 px-3 py-2" inputMode="decimal" onChange={(event) => setPriceRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, price: event.target.value } : item))} placeholder="ex. 12,50" value={row.price} />
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-bold">Capture d’écran ou document</p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-secondary px-4 py-2 text-sm font-bold text-secondary transition hover:bg-secondary/10" htmlFor="rfq-files">
                <Upload size={17} /> Choisir des fichiers
              </label>
              <input accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" id="rfq-files" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />
              {(activeSavedCell?.attachments.length ?? 0) > 0 && <div className="mt-3 space-y-1">{activeSavedCell?.attachments.map((attachment) => (
                <button className="flex cursor-pointer items-center gap-2 text-left text-sm text-secondary underline" key={attachment.id} onClick={() => void openAttachment(attachment.id)} type="button"><FileText size={16} />{attachment.file_name}</button>
              ))}</div>}
              {files.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>{files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :</p>
                  {files.map((file) => <p className="truncate" key={`${file.name}-${file.lastModified}`}>{file.name}</p>)}
                </div>
              )}
            </div>

            {saveError && <p className="mt-4 text-sm text-red-700" role="alert">{saveError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button className="cursor-pointer rounded border border-gray-300 px-4 py-2" onClick={() => setSelectedCell(null)} type="button">Annuler</button>
              <button className="cursor-pointer rounded bg-secondary px-5 py-2 font-bold text-white disabled:opacity-50" disabled={isSaving} onClick={() => void handleSave()} type="button">{isSaving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RFQ
