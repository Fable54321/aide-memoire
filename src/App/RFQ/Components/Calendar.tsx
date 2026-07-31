import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Layers3, Paperclip, X } from "lucide-react"
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
    { code: "B", name: "Boucherville" },
    { code: "Q", name: "Québec" },
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
  moveCells,
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
  moveCells: (data: { clientId: number; moves: Array<{ cellId: number; weekStart: string; locationCode: string }> }) => Promise<void>
}) => {
  const [draggedCell, setDraggedCell] = useState<RfqCell | null>(null)
  const [dropTargets, setDropTargets] = useState<string[]>([])
  const [moveError, setMoveError] = useState("")
  const [isMoving, setIsMoving] = useState(false)
  const [selectionProductId, setSelectionProductId] = useState<number | null>(null)
  const [selectedCellIds, setSelectedCellIds] = useState<Set<number>>(() => new Set())
  const longPressTimer = useRef<number | null>(null)
  const longPressActivated = useRef(false)
  const positions = weeks.flatMap((week) =>
    locations.map((location) => ({ weekStart: week.start, locationCode: location.code })),
  )
  const finishDrag = () => {
    setDraggedCell(null)
    setDropTargets([])
  }

  const clearSelection = () => {
    setSelectionProductId(null)
    setSelectedCellIds(new Set())
    setMoveError("")
  }

  const stopLongPressTimer = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const startLongPress = (event: ReactPointerEvent, cell: RfqCell | undefined) => {
    if (!cell || event.button !== 0 || isMoving) return
    stopLongPressTimer()
    longPressActivated.current = false
    longPressTimer.current = window.setTimeout(() => {
      setSelectionProductId(cell.product_id)
      setSelectedCellIds(new Set([cell.id]))
      setMoveError("")
      longPressActivated.current = true
      navigator.vibrate?.(40)
    }, 600)
  }

  const selectedCells = savedCells.filter((cell) => selectedCellIds.has(cell.id))

  const getGroupMove = (anchor: RfqCell, targetIndex: number) => {
    const group = selectedCellIds.has(anchor.id) && selectedCells.length > 1
      ? selectedCells
      : [anchor]
    const anchorIndex = positions.findIndex(
      (position) => position.weekStart === anchor.week_start && position.locationCode === anchor.location_code,
    )
    if (anchorIndex < 0) return null
    const offset = targetIndex - anchorIndex
    const moves = group.map((cell) => {
      const sourceIndex = positions.findIndex(
        (position) => position.weekStart === cell.week_start && position.locationCode === cell.location_code,
      )
      const destination = positions[sourceIndex + offset]
      return destination ? { cellId: cell.id, ...destination } : null
    })
    return moves.some((move) => move === null)
      ? null
      : moves as Array<{ cellId: number; weekStart: string; locationCode: string }>
  }

  const previewDropTargets = (anchor: RfqCell, targetIndex: number) => {
    const moves = getGroupMove(anchor, targetIndex)
    setDropTargets(
      moves?.map((move) => `${anchor.product_id}:${move.weekStart}:${move.locationCode}`) ?? [],
    )
  }

  return (
  <>
    {selectionProductId === null ? (
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-gray-600">
          Glissez une case pour la déplacer, ou maintenez-la enfoncée pour sélectionner un groupe.
        </p>
        {isMoving && <p className="font-bold text-secondary" role="status">Déplacement…</p>}
        {moveError && <p className="text-red-700" role="alert">{moveError}</p>}
      </div>
    ) : (
      <div className="mb-4 overflow-hidden rounded-xl border-2 border-secondary bg-tertiary shadow-md" role="status">
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
          <div className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full bg-lime-600 text-white shadow">
            <Layers3 aria-hidden="true" size={24} />
          </div>
          <div className="min-w-52 flex-1">
            <h4 className="text-lg font-black uppercase tracking-wide text-black/80 sm:text-xl">
              Mode multisélection activé
            </h4>
            <p className="mt-0.5 text-sm font-medium text-black/80">
              Cliquez sur d’autres cases du même produit, puis glissez une case sélectionnée pour déplacer tout le groupe.
            </p>
          </div>
          <div className="animate-bounce rounded-full bg-secondary px-4 py-2 text-center text-sm font-black text-white shadow" aria-live="polite">
            {selectedCellIds.size} case{selectedCellIds.size > 1 ? "s" : ""}
          </div>
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-secondary bg-tertiary px-3 py-2 text-sm font-bold text-Secondary transition hover:bg-cyan-100"
            onClick={clearSelection}
            type="button"
          >
            <X size={17} /> Annuler
          </button>
        </div>
        {isMoving && <p className="border-t border-cyan-200 bg-cyan-100 px-4 py-2 text-sm font-bold text-cyan-950">Déplacement du groupe…</p>}
        {moveError && <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700" role="alert">{moveError}</p>}
      </div>
    )}
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
              {location.code}
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
                    if (!draggedCell || product.id !== draggedCell.product_id) return
                    event.preventDefault()
                    previewDropTargets(draggedCell, weekIndex * locations.length + locationIndex)
                  }}
                  onDragOver={(event) => {
                    if (!draggedCell || product.id !== draggedCell.product_id) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!draggedCell || isMoving || product.id !== draggedCell.product_id) return
                    const moves = getGroupMove(draggedCell, weekIndex * locations.length + locationIndex)
                    if (!moves) {
                      setMoveError("Le groupe dépasserait les limites du calendrier.")
                      finishDrag()
                      return
                    }
                    const movingIds = new Set(moves.map((move) => move.cellId))
                    const occupiedTargets = new Set(
                      savedCells
                        .filter((cell) => cell.product_id === product.id && !movingIds.has(cell.id))
                        .map((cell) => `${cell.week_start}:${cell.location_code}`),
                    )
                    if (moves.some((move) => occupiedTargets.has(`${move.weekStart}:${move.locationCode}`))) {
                      setMoveError("Une des cases de destination est déjà occupée.")
                      finishDrag()
                      return
                    }
                    const hasChanged = moves.some((move) => {
                      const source = savedCells.find((cell) => cell.id === move.cellId)
                      return source?.week_start !== move.weekStart || source.location_code !== move.locationCode
                    })
                    if (!hasChanged) {
                      finishDrag()
                      return
                    }
                    setIsMoving(true)
                    setMoveError("")
                    const moveRequest = moves.length > 1
                      ? moveCells({ clientId, moves })
                      : moveCell({
                          cellId: moves[0].cellId,
                          clientId,
                          productId: product.id,
                          weekStart: moves[0].weekStart,
                          locationCode: moves[0].locationCode,
                        })
                    void moveRequest.then(() => {
                      clearSelection()
                    }).catch((error) => {
                      setMoveError(error instanceof Error ? error.message : "Impossible de déplacer la case.")
                    }).finally(() => {
                      setIsMoving(false)
                      finishDrag()
                    })
                  }}
                >
                  <button
                    className={`relative h-full min-h-6 w-full transition hover:bg-primary/35 focus:outline-2 focus:outline-secondary lg:min-h-8 ${savedCell ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${savedCell && selectedCellIds.has(savedCell.id) ? "animate-pulse ring-4 ring-inset ring-cyan-400" : ""}`}
                    draggable={Boolean(savedCell) && !isMoving}
                    onClick={() => {
                      if (longPressActivated.current) {
                        longPressActivated.current = false
                        return
                      }
                      if (selectionProductId !== null) {
                        if (!savedCell) return
                        if (savedCell.product_id !== selectionProductId) {
                          setMoveError("Toutes les cases sélectionnées doivent appartenir au même produit.")
                          return
                        }
                        setSelectedCellIds((current) => {
                          const next = new Set(current)
                          if (next.has(savedCell.id) && next.size > 1) next.delete(savedCell.id)
                          else next.add(savedCell.id)
                          return next
                        })
                        return
                      }
                      onOpenCell({ productId: product.id, productName: product.name, productItemCode: product.item_code, weekStart: week.start, weekLabel: week.label, locationCode: location.code, locationName: location.name })
                    }}
                    onDragEnd={finishDrag}
                    onDragStart={(event) => {
                      if (!savedCell) {
                        event.preventDefault()
                        return
                      }
                      if (selectionProductId !== null && !selectedCellIds.has(savedCell.id)) {
                        event.preventDefault()
                        setMoveError("Glissez une des cases sélectionnées pour déplacer le groupe.")
                        return
                      }
                      stopLongPressTimer()
                      setDraggedCell(savedCell)
                      setMoveError("")
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/plain", String(savedCell.id))
                    }}
                    onPointerCancel={stopLongPressTimer}
                    onPointerDown={(event) => startLongPress(event, savedCell)}
                    onPointerLeave={stopLongPressTimer}
                    onPointerUp={stopLongPressTimer}
                    title={`${savedCell ? "Glisser pour déplacer, maintenir pour sélectionner ou cliquer pour modifier" : "Modifier"} ${product.name}, ${week.label}, ${location.name}${displayedPrice !== undefined ? ` — ${displayedPrice} $` : ""}`}
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
  const { productsByClient, loadingByClient, errorsByClient, loadClientProducts, cellsByClient, moveCell, moveCells } = useRfq()
  const products = productsByClient[selectedSupplier.id] ?? []
  const savedCells = cellsByClient[selectedSupplier.id] ?? []
  const { clientKey, isMetro, isSobeys } = getRfqClientConfig(selectedSupplier.id)
  const locations = locationsByClient[clientKey]
  const alternateWeekColor = isMetro ? "bg-orange-100" : isSobeys ? "bg-fuchsia-100" : "bg-green-100"
  const weeks = useMemo(() => Array.from({ length: isMetro ? 13 : isSobeys ? 6 : 8 }, (_, index) => {
    const start = addDays(isSobeys ? getSunday(new Date()) : getMonday(new Date()), index * 7)
    const end = addDays(start, 6)
    return {
      start: formatDateKey(start),
      number: getIsoWeek(start),
      startLabel: formatShortDate(isMetro ? addDays(start, -1) : start),
      endLabel: formatShortDate(isMetro ? addDays(start, 7) : end),
      title: isSobeys ? `SF ${addDays(end, 4).getDate()} ${monthNames[addDays(end, 4).getMonth()]}` : isMetro ? null : `SE ${getIsoWeek(start)}`,
      label: formatWeekRange(start, end),
    }
  }), [isMetro, isSobeys])

  if (loadingByClient[selectedSupplier.id]) return <p className="py-8 text-center text-sm text-gray-600">Chargement des produits...</p>
  const error = errorsByClient[selectedSupplier.id]
  if (error) return <div className="py-8 text-center text-sm"><p className="text-red-700" role="alert">{error}</p><button className="mt-3 cursor-pointer font-bold text-secondary underline" onClick={() => void loadClientProducts(selectedSupplier.id)} type="button">Réessayer</button></div>
  if (!products.length) return <p className="py-8 text-center text-sm text-gray-600">Aucun produit actif pour {selectedSupplier.name}.</p>

  return (
    <>
      <CalendarTable alternateWeekColor={alternateWeekColor} clientId={selectedSupplier.id} isMetro={isMetro} isSobeys={isSobeys} locations={locations} moveCell={moveCell} moveCells={moveCells} onOpenCell={onOpenCell} products={products} savedCells={savedCells} weeks={weeks} />
      <div className={`mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 ${locations.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {locations.map((location) => <div key={location.code}><p><strong>{location.code}</strong> = {location.name}</p>{location.details?.map((detail) => <p className="pl-4" key={detail}>{detail}</p>)}</div>)}
      </div>
    </>
  )
}

export default Calendar
