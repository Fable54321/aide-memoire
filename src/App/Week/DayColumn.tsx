import { type DragEvent } from "react"
import { type Vegetable } from "../../Contexts/vegetablesContext"
import "./DayColumn.css"

type Supplier = {
  id: string
  name: string
  logo: string
}

type QuotationDay = {
  key: string
  label: string
  shortDate: string
}

type Quotation = {
  id: string
  savedQuotationId: string | null
  isSaving: boolean
  saveError: string | null
  hasUnsavedChanges: boolean
  supplier: Supplier | null
  vegetable: Vegetable | null
  price: string
  createdAt: string | null
}


type DayColumnProps = {
  day: QuotationDay
  index: number
  isDragOver: boolean
  quotations: Quotation[]
  onQuotationDragOver: (event: DragEvent<HTMLElement>) => void
  onQuotationDrop: (event: DragEvent<HTMLElement>, quotationId: string) => void
  onQuotationDelete: (quotationId: string) => void
  onQuotationPriceChange: (quotationId: string, price: string) => void
  onDragEnter: (dayKey: string) => void
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>, dayKey: string) => void
}

const formatTime = (dateValue: string | null) => {
  if (!dateValue) {
    return "--:--"
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return "--:--"
  }

  return date.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// const NewQuotationDrop = ({ isDragOver }: NewQuotationDropProps) => {
//   return (
//     <div
//       className={`mx-2 mt-3 flex min-h-20 w-[calc(100%-1rem)] flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed px-3 py-3 text-secondary transition md:mx-3 md:mt-4 md:min-h-24 md:w-[calc(100%-1.5rem)] md:px-4 ${
//         isDragOver
//           ? "border-primary bg-primary/15 ring-2 ring-primary/35"
//           : "border-secondary/60 bg-white/40"
//       }`}
//     >
//       <span className="text-center text-sm font-bold uppercase tracking-wide">
//         Zone de glisser-deposer
//       </span>
//       <span className="text-center text-xs text-gray-500">
//         Optionnel: glisser un logo ou un legume ici
//       </span>
//     </div>
//   )
// }

const DayColumn = ({
  day,
  index,
  quotations,
  onQuotationDragOver,
  onQuotationDrop,
  onQuotationDelete,
  onQuotationPriceChange,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: DayColumnProps) => {
  return (
    <div
      className={`min-h-96 w-full border-2 ${index < 3 ? "border-t-4" : ""} ${
        index === 0 || index === 3 ? "border-l-4" : ""
      } ${index === 2 || index === 5 ? "border-r-4" : ""} bg-white/35 pb-4 md:min-h-150 md:flex-1`}
      onDragEnter={() => onDragEnter(day.key)}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={(event) => onDrop(event, day.key)}
    >
      <h3
        className={`${
          index % 2 === 0 ? "bg-secondary" : "bg-primary"
        } flex flex-col border-b border-gray-300 py-2 text-center font-semibold`}
      >
        <span className={`${day.label === "Aujourd'hui" ? "today" : ""} text-[1.2em] text-white`}>
          {day.label}
        </span>
        <span className="text-sm text-white">{day.shortDate}</span>
      </h3>

      <div className="mx-2 mt-3 flex flex-col gap-3 md:mx-3 md:mt-4">
        {quotations.map((quotation) => {
          const isComplete = quotation.supplier && quotation.vegetable && quotation.price.trim() !== ""

          return (
            <article
              className="rounded border border-secondary/25 bg-white p-3 shadow-sm"
              key={quotation.id}
              onDragOver={onQuotationDragOver}
              onDrop={(event) => onQuotationDrop(event, quotation.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {quotation.supplier && (
                    <div className="grid h-12 w-16 flex-none place-items-center rounded border border-gray-200 bg-white px-2 py-1">
                      <img
                        className="max-h-full max-w-full object-contain"
                        src={quotation.supplier.logo}
                        alt={quotation.supplier.name}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-secondary">
                      {quotation.supplier?.name ?? "Client a choisir"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {quotation.vegetable?.vegetable ?? "Legume a choisir"}
                    </p>
                  </div>
                </div>
                <button
                  className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  onClick={() => onQuotationDelete(quotation.id)}
                  type="button"
                >
                  Supprimer
                </button>
              </div>

              {isComplete ? (
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-black leading-none text-secondary">{quotation.price}</p>
                    <p className="mt-1 text-sm font-bold text-gray-600">/ qté</p>
                  </div>
                  <div className="text-right text-xs font-semibold text-gray-500">
                    <p>{formatTime(quotation.createdAt)}</p>
                    {quotation.isSaving && <p>Sauvegarde...</p>}
                    {quotation.saveError && <p className="text-red-700">{quotation.saveError}</p>}
                  </div>
                </div>
              ) : (
                <label className="mt-3 flex items-center rounded border border-gray-300 bg-white px-2">
                  <span className="text-sm font-bold text-secondary">$</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-1 py-2 text-center text-2xl outline-none md:text-[2em]"
                    inputMode="decimal"
                    onChange={(event) => onQuotationPriceChange(quotation.id, event.target.value)}
                    placeholder="0.00"
                    type="text"
                    value={quotation.price}
                  />
                  <span className="text-sm font-bold text-secondary">/qté</span>
                </label>
              )}
            </article>
          )
        })}
      </div>

     
    </div>
  )
}

export default DayColumn
