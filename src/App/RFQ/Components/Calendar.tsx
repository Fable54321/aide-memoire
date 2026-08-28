import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Paperclip } from "lucide-react"
import { useRfq, type RfqCell, type RfqProduct } from "../../../Contexts/rfqContext"
import {
  getRfqClientConfig,
  type RfqSupplier,
  type SelectedRfqCell,
} from "../../../Utils/rfqUtils"

type CalendarProps = {
  selectedSupplier: RfqSupplier
  onOpenCell: (cell: SelectedRfqCell) => void
}

type Location = {
  code: string
  displayCode?: string
  name: string
  details?: readonly string[]
}

const locationsByClient: Record<"loblaws" | "metro" | "sobeys", readonly Location[]> = {
  loblaws: [
    { code: "B", name: "Boucherville" },
    { code: "C", name: "Caledonia (maritime)" },
    { code: "M", name: "Maplegrove (Ontario)" },
    { code: "W", name: "Ouest canadien" },
  ],
  metro: [
    { code: "M", name: "Montréal (ZP 01)" },
    { code: "T", name: "Toronto (ZP 03)" },
  ],
  sobeys: [
    { code: "B", displayCode: "B/Q", name: "Boucherville / Québec" },
    { code: "O", name: "Ontario", details: ["Debert", "Witby"] },
    { code: "W", name: "Ouest canadien", details: ["Campbell", "Winnipeg", "Calgary", "Edmonton"] },
    { code: "A", name: "Atlantique", details: ["Mt-Pearl"] },
  ],
}

const monthNames = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getMonday = (date: Date) => addDays(date, 1 - (date.getDay() || 7))
const getSunday = (date: Date) => addDays(date, -date.getDay())

const getIsoWeek = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const formatShortDate = (date: Date) => `${date.getDate()} ${monthNames[date.getMonth()]}`

const formatWeekRange = (start: Date, end: Date) =>
  start.getMonth() === end.getMonth()
    ? `${start.getDate()} au ${end.getDate()} ${monthNames[end.getMonth()]}`
    : `${start.getDate()} ${monthNames[start.getMonth()]} au ${end.getDate()} ${monthNames[end.getMonth()]}`

const CalendarTable = ({
  products,
  savedCells,
  locations,
  weeks,
  isMetro,
  isSobeys,
  alternateWeekColor,
  onOpenCell,
  clientId,
  moveCell,
}: {
  products: RfqProduct[]
  savedCells: RfqCell[]
  locations: readonly Location[]
  weeks: Array<{ start: string; number: number; startLabel: string; endLabel: string; title: string | null; label: string }>
  isMetro: boolean
  isSobeys: boolean
  alternateWeekColor: string
  onOpenCell: CalendarProps["onOpenCell"]
  clientId: number
  moveCell: (data: { cellId: number; clientId: number; productId: number; weekStart: string; locationCode: string }) => Promise<void>
}) => {
  const [draggedCell, setDraggedCell] = useState<RfqCell | null>(null)
  const [dropTargets, setDropTargets] = useState<string[]>([])
  const [moveError, setMoveError] = useState("")
  const [isMoving, setIsMoving] = useState(false)
  const finishDrag = () => {
    setDraggedCell(null)
    setDropTargets([])
  }

  return (
  <>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <p className="text-gray-600">Glissez une case pour la déplacer vers une autre semaine ou un autre produit.</p>
      {isMoving && <p className="font-bold text-secondary" role="status">Déplacement…</p>}
      {moveError && <p className="text-red-700" role="alert">{moveError}</p>}
    </div>
    <div className="overflow-x-auto pb-2">
    <table className="mx-auto w-max table-auto border-collapse text-sm text-black">
      <thead>
        <tr>
          <th className="sticky left-0 z-20 w-56 min-w-56 bg-white lg:w-64 lg:min-w-64" rowSpan={2}><span className="sr-only">Produits</span></th>
          {weeks.map((week, weekIndex) => (
            <th className={`border-2 border-black px-1 py-2 text-center ${weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"}`} colSpan={locations.length} key={`${week.number}-${weekIndex}`} scope="colgroup">
              {isMetro ? (
                <>
                  <span className="block text-sm font-extrabold leading-tight">Sem</span>
                  <span className="block text-base font-extrabold leading-tight">{week.number}</span>
                  <span className="mt-1 block whitespace-nowrap text-[10px] font-bold leading-tight">{week.startLabel}</span>
                  <span className="block whitespace-nowrap text-[10px] font-bold leading-tight">{week.endLabel}</span>
                </>
              ) : (
                <>
                  {week.title && <span className="block text-base font-extrabold">{week.title}</span>}
                  <span className="block whitespace-nowrap text-[10px] font-bold">{week.label}</span>
                </>
              )}
            </th>
          ))}
        </tr>
        <tr>
          {weeks.flatMap((week, weekIndex) => locations.map((location, locationIndex) => (
            <th className={`h-6 min-w-8.75 border-y-2 border-black text-center font-extrabold lg:h-8 ${locationIndex === 0 ? "border-l-2" : "border-l border-l-black/60"} ${locationIndex === locations.length - 1 ? "border-r-2" : ""} ${weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"}`} key={`${week.number}-${weekIndex}-${location.code}`} scope="col" title={location.name}>
              {location.displayCode ?? location.code}
            </th>
          )))}
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <th className={`sticky left-0 z-10 h-6 w-56 min-w-56 border border-black bg-white px-2 text-left font-normal lg:h-8 lg:w-64 lg:min-w-64 lg:px-3 ${isSobeys ? "text-fuchsia-800" : ""}`} scope="row">
              {product.name}{product.item_code && <span className="text-black"> ({product.item_code})</span>}
            </th>
            {weeks.flatMap((week, weekIndex) => locations.map((location, locationIndex) => {
              const savedCell = savedCells.find((cell) => cell.product_id === product.id && cell.week_start === week.start && cell.location_code === location.code)
              const displayedPrice = savedCell?.prices[0]?.price
              const targetKey = `${product.id}:${week.start}:${location.code}`
              return (
                <td
                  aria-label={`${product.name}, semaine ${week.number}, ${location.name}`}
                  className={`h-6 min-w-8.75 border-y border-black/60 transition lg:h-8 ${locationIndex === 0 ? "border-l-2 border-l-black" : "border-l border-l-black/40"} ${locationIndex === locations.length - 1 ? "border-r-2 border-r-black" : ""} ${weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"} ${dropTargets.includes(targetKey) ? "outline-4 -outline-offset-4 outline-secondary" : ""}`}
                  key={`${product.id}-${week.number}-${weekIndex}-${location.code}`}
                  onDragEnter={(event) => {
                    if (!draggedCell) return
                    event.preventDefault()
                    setDropTargets([targetKey])
                  }}
                  onDragOver={(event) => {
                    if (!draggedCell) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!draggedCell || isMoving) return
                    if (savedCell && savedCell.id !== draggedCell.id) {
                      setMoveError("La case de destination est déjà occupée.")
                      finishDrag()
                      return
                    }
                    const hasChanged = draggedCell.product_id !== product.id ||
                      draggedCell.week_start !== week.start ||
                      draggedCell.location_code !== location.code
                    if (!hasChanged) {
                      finishDrag()
                      return
                    }
                    setIsMoving(true)
                    setMoveError("")
                    void moveCell({
                      cellId: draggedCell.id,
                      clientId,
                      productId: product.id,
                      weekStart: week.start,
                      locationCode: location.code,
                    }).catch((error) => {
                      setMoveError(error instanceof Error ? error.message : "Impossible de déplacer la case.")
                    }).finally(() => {
                      setIsMoving(false)
                      finishDrag()
                    })
                  }}
                >
                  <button
                    className={`relative h-full min-h-6 w-full transition hover:bg-primary/35 focus:outline-2 focus:outline-secondary lg:min-h-8 ${savedCell ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                    draggable={Boolean(savedCell) && !isMoving}
                    onClick={() => {
                      onOpenCell({ productId: product.id, productName: product.name, productItemCode: product.item_code, weekStart: week.start, weekLabel: week.label, locationCode: location.code, locationName: location.name })
                    }}
                    onDragEnd={finishDrag}
                    onDragStart={(event) => {
                      if (!savedCell) {
                        event.preventDefault()
                        return
                      }
                      setDraggedCell(savedCell)
                      setMoveError("")
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/plain", String(savedCell.id))
                    }}
                    title={`${savedCell ? "Glisser pour déplacer ou cliquer pour modifier" : "Modifier"} ${product.name}, ${week.label}, ${location.name}${displayedPrice !== undefined ? ` — ${displayedPrice} $` : ""}`}
                    type="button"
                  >
                    {(savedCell?.attachments.length ?? 0) > 0 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-1.25 -top-1.75 z-30 text-gray-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"

                        title={`${savedCell?.attachments.length} fichier${savedCell?.attachments.length === 1 ? "" : "s"} joint${savedCell?.attachments.length === 1 ? "" : "s"}`}
                      >
                        <Paperclip className="-rotate-35" size={16} strokeWidth={2} color={savedCell?.status === "email" ? "#000000" : "#000000"} />
                      </span>
                    )}
                    <span aria-hidden="true" className={`inline-flex h-full min-w-full items-center justify-center whitespace-nowrap px-1 py-1 font-black leading-none lg:text-[1.3rem]  ${savedCell?.status === "final" ? "bg-primary text-white" : savedCell?.status === "email" ? "bg-[#4C1CC6] text-white" : ""}`}>{displayedPrice}</span>
                    <span className="sr-only">
                      {displayedPrice !== undefined
                        ? `Modifier cette case, prix ${displayedPrice} dollars, ${savedCell?.status === "final" ? "prix final" : "prix reçu par courriel"}`
                        : "Modifier cette case"}
                      {(savedCell?.attachments.length ?? 0) > 0
                        ? `, ${savedCell?.attachments.length} fichier${savedCell?.attachments.length === 1 ? "" : "s"} joint${savedCell?.attachments.length === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </button>
                </td>
              )
            }))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  </>
  )
}

const Calendar = ({ selectedSupplier, onOpenCell }: CalendarProps) => {
  const [weekOffset, setWeekOffset] = useState(0)
  const { productsByClient, loadingByClient, errorsByClient, loadClientProducts, cellsByClient, moveCell } = useRfq()
  const products = productsByClient[selectedSupplier.id] ?? []
  const savedCells = cellsByClient[selectedSupplier.id] ?? []
  const { clientKey, isMetro, isSobeys } = getRfqClientConfig(selectedSupplier.id)
  const locations = locationsByClient[clientKey]
  const alternateWeekColor = isMetro ? "bg-orange-100" : isSobeys ? "bg-fuchsia-100" : "bg-green-100"
  const weeks = useMemo(() => Array.from({ length: isMetro ? 13 : isSobeys ? 7 : 8 }, (_, index) => {
    const start = addDays(isSobeys ? getSunday(new Date()) : getMonday(new Date()), (index + weekOffset) * 7)
    const end = addDays(start, 6)
    return {
      start: formatDateKey(start),
      number: getIsoWeek(start),
      startLabel: formatShortDate(isMetro ? addDays(start, -1) : start),
      endLabel: formatShortDate(isMetro ? addDays(start, 7) : end),
      title: isSobeys ? `SF ${addDays(end, 4).getDate()} ${monthNames[addDays(end, 4).getMonth()]}` : isMetro ? null : `SE ${getIsoWeek(start)}`,
      label: formatWeekRange(start, end),
    }
  }), [isMetro, isSobeys, weekOffset])

  if (loadingByClient[selectedSupplier.id]) return <p className="py-8 text-center text-sm text-gray-600">Chargement des produits...</p>
  const error = errorsByClient[selectedSupplier.id]
  if (error) return <div className="py-8 text-center text-sm"><p className="text-red-700" role="alert">{error}</p><button className="mt-3 cursor-pointer font-bold text-secondary underline" onClick={() => void loadClientProducts(selectedSupplier.id)} type="button">Réessayer</button></div>
  if (!products.length) return <p className="py-8 text-center text-sm text-gray-600">Aucun produit actif pour {selectedSupplier.name}.</p>

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3" aria-label="Navigation entre les semaines">
        <button
          aria-label="Afficher les semaines précédentes"
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-secondary px-3 py-1.5 text-sm font-bold text-secondary transition hover:bg-secondary/10"
          onClick={() => setWeekOffset((current) => current - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          Précédentes
        </button>
        {weekOffset < 0 && (
          <p
            className="rounded-full border border-[#b79fad] bg-[#fae8ff] px-3 py-1.5 text-md font-bold text-black"
            role="status"
          >
            Vue passée — {Math.abs(weekOffset)} semaine{weekOffset < -1 ? "s" : ""} en arrière
          </p>
        )}
        <button
          aria-label="Afficher les semaines suivantes"
          className="inline-flex items-center gap-1 rounded border border-secondary px-3 py-1.5 text-sm font-bold text-secondary transition hover:bg-secondary/10 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset((current) => Math.min(0, current + 1))}
          type="button"
        >
          Suivantes
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
      <CalendarTable alternateWeekColor={alternateWeekColor} clientId={selectedSupplier.id} isMetro={isMetro} isSobeys={isSobeys} locations={locations} moveCell={moveCell} onOpenCell={onOpenCell} products={products} savedCells={savedCells} weeks={weeks} />
      <div className={`mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 ${locations.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {locations.map((location) => <div key={location.code}><p><strong>{location.displayCode ?? location.code}</strong> = {location.name}</p>{location.details?.map((detail) => <p className="pl-4" key={detail}>{detail}</p>)}</div>)}
      </div>
    </>
  )
}

export default Calendar
