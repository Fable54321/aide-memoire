import { useMemo, useState, type DragEvent } from "react"

import costco from "../../assets/images/costco-wholesale.svg"
import dpro from "../../assets/images/DPro.png"
import loblaws from "../../assets/images/loblaws.svg"
import metro from "../../assets/images/metro-inc-logo.svg"
import sobeys from "../../assets/images/sobeys-logo.svg"
import { useVegetables, type Vegetable } from "../../Contexts/vegetablesContext"

const suppliers = [
  { id: "costco", name: "Costco", logo: costco },
  { id: "sobeys", name: "Sobeys", logo: sobeys },
  { id: "loblaws", name: "Loblaws", logo: loblaws },
  { id: "dpro", name: "DPro", logo: dpro },
  { id: "metro", name: "Metro", logo: metro },
]

const weekRows = [
  ["Lundi", "Mardi", "Mercredi", "Jeudi"],
  ["Vendredi", "Samedi", "Dimanche"],
]

const getDateOnly = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const parseSalesDate = (date: string) => {
  if (!date) {
    return null
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return getDateOnly(parsedDate)
}

const isDateBetween = (date: Date, startDate: string, endDate: string) => {
  const parsedStartDate = parseSalesDate(startDate)
  const parsedEndDate = parseSalesDate(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return false
  }

  return date >= parsedStartDate && date <= parsedEndDate
}

const autoScrollPageWhileDragging = (clientY: number) => {
  const scrollZone = 120
  const scrollSpeed = 18

  if (clientY < scrollZone) {
    window.scrollBy({ top: -scrollSpeed })
  }

  if (clientY > window.innerHeight - scrollZone) {
    window.scrollBy({ top: scrollSpeed })
  }
}

type Supplier = (typeof suppliers)[number]

type Quotation = {
  id: string
  supplier: Supplier | null
  vegetable: Vegetable | null
  price: string
}

type QuotationsByDay = Record<string, Quotation[]>

type NewQuotationDropProps = {
  isDragOver: boolean
}




const NewQuotationDrop = ({ isDragOver }: NewQuotationDropProps) => {
  return (
    <div
      className={`mx-3 mt-4 flex min-h-24 w-[calc(100%-1.5rem)] flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-3 text-secondary shadow-sm transition ${
        isDragOver
          ? "border-primary bg-primary/15 ring-2 ring-primary/35"
          : "border-secondary/70 bg-white/70"
      }`}
    >
      <span className="grid h-8 w-8 place-items-center rounded border border-secondary/40 bg-tertiary text-2xl leading-none shadow-inner">
        +
      </span>
      <span className="text-center text-sm font-bold">Nouvelle quotation</span>
      <span className="text-center text-xs text-gray-500">Glisser un logo ou un legume ici</span>
    </div>
  )
}

type DayColumnProps = {
  day: string
  isDragOver: boolean
  quotations: Quotation[]
  onQuotationDragOver: (event: DragEvent<HTMLElement>) => void
  onQuotationDrop: (event: DragEvent<HTMLElement>, quotationId: string) => void
  onQuotationPriceChange: (quotationId: string, price: string) => void
  onDragEnter: (day: string) => void
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>, day: string) => void
}

const DayColumn = ({
  day,
  isDragOver,
  quotations,
  onQuotationDragOver,
  onQuotationDrop,
  onQuotationPriceChange,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: DayColumnProps) => {
  return (
    <div
      className="min-h-150 flex-1 border-2 border-gray-500 bg-white/35"
      onDragEnter={() => onDragEnter(day)}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={(event) => onDrop(event, day)}
    >
      <h3 className="border-b border-gray-300 bg-tertiary py-2 text-center text-[1.2em] font-semibold">
        {day}
      </h3>
      <div className="mx-3 mt-4 flex flex-col gap-3">
        {quotations.map((quotation) => (
          <article
            className="flex flex-col gap-3 rounded border border-secondary/30 bg-white p-3 shadow-sm"
            key={quotation.id}
            onDragOver={onQuotationDragOver}
            onDrop={(event) => onQuotationDrop(event, quotation.id)}
          >
            <div className="flex min-h-14 items-center gap-3 rounded border border-dashed border-secondary/50 bg-tertiary px-3">
              {quotation.supplier ? (
                <>
                  <img
                    className="h-10 w-20 object-contain"
                    src={quotation.supplier.logo}
                    alt={quotation.supplier.name}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-secondary">{quotation.supplier.name}</p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="font-semibold text-secondary">Deposer un client</p>
                  <p className="text-xs text-gray-500">Glisser un logo ici</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex min-h-11 items-center rounded border border-dashed border-secondary/50 bg-tertiary px-3 text-sm font-semibold text-secondary">
                {quotation.vegetable?.vegetable ?? "Deposer un legume"}
              </div>
              <label className="flex items-center rounded border border-gray-300 bg-white px-2">
                <span className="text-sm font-bold text-secondary">$</span>
                <input
                  className="text-center text-[2em] min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                  inputMode="decimal"
                  onChange={(event) => onQuotationPriceChange(quotation.id, event.target.value)}
                  placeholder="0.00"
                  type="text"
                  value={quotation.price}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
      <NewQuotationDrop isDragOver={isDragOver} />
    </div>
  )
}

const Week = () => {
  const [quotationsByDay, setQuotationsByDay] = useState<QuotationsByDay>({})
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const { vegetables } = useVegetables()

  const today = getDateOnly(new Date())

  const groupedVegetables = useMemo(() => {
    const filteredVegetables = vegetables
      .filter((vegetable) => vegetable.vegetable !== "AUCUNE" && vegetable.is_generic === false)
      .map((vegetable) => ({
        isCurrentlySold:
          isDateBetween(today, vegetable.sales_debut_1, vegetable.sales_end_1) ||
          isDateBetween(today, vegetable.sales_debut_2, vegetable.sales_end_2),
        vegetable,
      }))

    return {
      currentlySoldVegetables: filteredVegetables
        .filter(({ isCurrentlySold }) => isCurrentlySold)
        .sort((firstVegetable, secondVegetable) =>
          firstVegetable.vegetable.vegetable.localeCompare(secondVegetable.vegetable.vegetable),
        ),
      otherVegetables: filteredVegetables
        .filter(({ isCurrentlySold }) => !isCurrentlySold)
        .sort((firstVegetable, secondVegetable) =>
          firstVegetable.vegetable.vegetable.localeCompare(secondVegetable.vegetable.vegetable),
        ),
    }
  }, [vegetables, today])

  const handleLogoDragStart = (
    event: DragEvent<HTMLImageElement>,
    supplierId: Supplier["id"],
  ) => {
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("application/x-supplier-id", supplierId)
  }

  const handleVegetableDragStart = (
    event: DragEvent<HTMLElement>,
    vegetableId: Vegetable["id"],
  ) => {
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("application/x-vegetable-id", String(vegetableId))
  }

  const handleDayDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    autoScrollPageWhileDragging(event.clientY)
  }

  const handleDayDrop = (event: DragEvent<HTMLDivElement>, day: string) => {
    event.preventDefault()

    const supplierId = event.dataTransfer.getData("application/x-supplier-id")
    const vegetableId = Number(event.dataTransfer.getData("application/x-vegetable-id"))
    const supplier = suppliers.find((currentSupplier) => currentSupplier.id === supplierId)
    const vegetable = vegetables.find((currentVegetable) => currentVegetable.id === vegetableId)

    setDragOverDay(null)

    if (!supplier && !vegetable) {
      return
    }

    setQuotationsByDay((currentQuotationsByDay) => ({
      ...currentQuotationsByDay,
      [day]: [
        ...(currentQuotationsByDay[day] ?? []),
        {
          id: `${supplier?.id ?? vegetable?.id}-${day}-${crypto.randomUUID()}`,
          price: "",
          supplier: supplier ?? null,
          vegetable: vegetable ?? null,
        },
      ],
    }))
  }

  const handleQuotationDragOver = (event: DragEvent<HTMLElement>) => {
    const hasQuotationPart =
      event.dataTransfer.types.includes("application/x-supplier-id") ||
      event.dataTransfer.types.includes("application/x-vegetable-id")

    if (!hasQuotationPart) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    autoScrollPageWhileDragging(event.clientY)
  }

  const handleQuotationDrop = (event: DragEvent<HTMLElement>, quotationId: string) => {
    event.preventDefault()
    event.stopPropagation()

    const supplierId = event.dataTransfer.getData("application/x-supplier-id")
    const vegetableId = Number(event.dataTransfer.getData("application/x-vegetable-id"))
    const supplier = suppliers.find((currentSupplier) => currentSupplier.id === supplierId)
    const vegetable = vegetables.find((currentVegetable) => currentVegetable.id === vegetableId)

    if (!supplier && !vegetable) {
      return
    }

    setQuotationsByDay((currentQuotationsByDay) => {
      return Object.fromEntries(
        Object.entries(currentQuotationsByDay).map(([day, quotations]) => [
          day,
          quotations.map((quotation) =>
            quotation.id === quotationId
              ? {
                  ...quotation,
                  supplier: supplier ?? quotation.supplier,
                  vegetable: vegetable ?? quotation.vegetable,
                }
              : quotation,
          ),
        ]),
      )
    })
  }

  const handleQuotationPriceChange = (quotationId: string, price: string) => {
    setQuotationsByDay((currentQuotationsByDay) => {
      return Object.fromEntries(
        Object.entries(currentQuotationsByDay).map(([day, quotations]) => [
          day,
          quotations.map((quotation) =>
            quotation.id === quotationId ? { ...quotation, price } : quotation,
          ),
        ]),
      )
    })
  }

  return (
    <section
      className="flex w-full flex-col items-center"
      onDragOver={(event) => autoScrollPageWhileDragging(event.clientY)}
    >
      <h2 className="text-center text-[1.5rem]">Semaine actuelle</h2>

      <div className="flex flex-wrap justify-center gap-4">
        {suppliers.map((supplier) => (
          <img
            className="h-20 w-40 cursor-grab rounded bg-white px-3 py-2 object-contain shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
            draggable
            key={supplier.id}
            onDragStart={(event) => handleLogoDragStart(event, supplier.id)}
            src={supplier.logo}
            alt={supplier.name}
            title={`Glisser ${supplier.name}`}
          />
        ))}
      </div>
      <div className="mt-5 flex w-[99%] flex-col gap-5">
        <div className="flex flex-wrap justify-center gap-4">
          {groupedVegetables.currentlySoldVegetables.map(({ vegetable }) => (
            <article
              className="min-w-44 cursor-grab rounded border-2 border-secondary bg-primary px-5 py-4 text-center text-white shadow-lg ring-2 ring-secondary/25 active:cursor-grabbing"
              draggable
              key={vegetable.id}
              onDragStart={(event) => handleVegetableDragStart(event, vegetable.id)}
              title={`Glisser ${vegetable.vegetable}`}
            >
              <p className="text-lg font-bold">{vegetable.vegetable}</p>
              <p className="mt-1 text-xs font-semibold text-white/90">En vente</p>
            </article>
          ))}
        </div>

        <div className="border-t border-gray-300 pt-4">
          <div className="grid grid-cols-4 gap-2">
            {groupedVegetables.otherVegetables.map(({ vegetable }) => (
              <p
                className="cursor-grab rounded border border-gray-200 bg-white/60 px-3 py-2 text-sm text-gray-700 active:cursor-grabbing"
                draggable
                key={vegetable.id}
                onDragStart={(event) => handleVegetableDragStart(event, vegetable.id)}
                title={`Glisser ${vegetable.vegetable}`}
              >
                {vegetable.vegetable}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex w-[99%] flex-col justify-around">
        {weekRows.map((days) => (
          <div className="flex" key={days.join("-")}>
            {days.map((day) => (
              <DayColumn
                day={day}
                isDragOver={dragOverDay === day}
                key={day}
                onQuotationDragOver={handleQuotationDragOver}
                onQuotationDrop={handleQuotationDrop}
                onQuotationPriceChange={handleQuotationPriceChange}
                onDragEnter={setDragOverDay}
                onDragLeave={() => setDragOverDay(null)}
                onDragOver={handleDayDragOver}
                onDrop={handleDayDrop}
                quotations={quotationsByDay[day] ?? []}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export default Week
