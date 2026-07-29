import { useMemo } from "react"
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
}: {
  products: RfqProduct[]
  savedCells: RfqCell[]
  locations: readonly Location[]
  weeks: Array<{ start: string; number: number; startLabel: string; endLabel: string; title: string | null; label: string }>
  isMetro: boolean
  isSobeys: boolean
  alternateWeekColor: string
  onOpenCell: CalendarProps["onOpenCell"]
}) => (
  <div className="overflow-x-auto pb-2">
    <table className="w-max min-w-full table-fixed border-collapse text-sm text-black">
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
            <th className={`h-6 w-6 min-w-6 border-y-2 border-black text-center font-extrabold lg:h-8 lg:w-8 lg:min-w-8 ${locationIndex === 0 ? "border-l-2" : "border-l border-l-black/60"} ${locationIndex === locations.length - 1 ? "border-r-2" : ""} ${weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"}`} key={`${week.number}-${weekIndex}-${location.code}`} scope="col" title={location.name}>
              {location.code}
            </th>
          )))}
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <th className={`sticky left-0 z-10 h-6 w-56 min-w-56 border border-black bg-white px-2 text-left font-normal lg:h-8 lg:w-64 lg:min-w-64 lg:px-3 ${isSobeys ? "text-fuchsia-800" : ""}`} scope="row">{product.name}</th>
            {weeks.flatMap((week, weekIndex) => locations.map((location, locationIndex) => {
              const savedCell = savedCells.find((cell) => cell.product_id === product.id && cell.week_start === week.start && cell.location_code === location.code)
              const displayedPrice = savedCell?.prices[0]?.price
              return (
                <td aria-label={`${product.name}, semaine ${week.number}, ${location.name}`} className={`h-6 w-6 min-w-6 border-y border-black/60 lg:h-8 lg:w-8 lg:min-w-8 ${locationIndex === 0 ? "border-l-2 border-l-black" : "border-l border-l-black/40"} ${locationIndex === locations.length - 1 ? "border-r-2 border-r-black" : ""} ${weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"}`} key={`${product.id}-${week.number}-${weekIndex}-${location.code}`}>
                  <button className="h-full min-h-6 w-full cursor-pointer transition hover:bg-primary/35 focus:outline-2 focus:outline-secondary lg:min-h-8" onClick={() => onOpenCell({ productId: product.id, productName: product.name, weekStart: week.start, weekLabel: week.label, locationCode: location.code, locationName: location.name })} title={`Modifier ${product.name}, ${week.label}, ${location.name}${displayedPrice !== undefined ? ` — ${displayedPrice} $` : ""}`} type="button">
                    <span aria-hidden="true" className={`inline-flex h-full w-full items-center justify-center overflow-hidden text-base font-black leading-none lg:text-lg ${savedCell?.status === "final" ? "bg-primary text-white" : savedCell?.status === "email" ? "bg-[#4C1CC6] text-white" : ""}`}>{displayedPrice}</span>
                    <span className="sr-only">{displayedPrice !== undefined ? `Modifier cette case, prix ${displayedPrice} dollars, ${savedCell?.status === "final" ? "prix final" : "prix reçu par courriel"}` : "Modifier cette case"}</span>
                  </button>
                </td>
              )
            }))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const Calendar = ({ selectedSupplier, onOpenCell }: CalendarProps) => {
  const { productsByClient, loadingByClient, errorsByClient, loadClientProducts, cellsByClient } = useRfq()
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
      <CalendarTable alternateWeekColor={alternateWeekColor} isMetro={isMetro} isSobeys={isSobeys} locations={locations} onOpenCell={onOpenCell} products={products} savedCells={savedCells} weeks={weeks} />
      <div className={`mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 ${locations.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {locations.map((location) => <div key={location.code}><p><strong>{location.code}</strong> = {location.name}</p>{location.details?.map((detail) => <p className="pl-4" key={detail}>{detail}</p>)}</div>)}
      </div>
    </>
  )
}

export default Calendar
