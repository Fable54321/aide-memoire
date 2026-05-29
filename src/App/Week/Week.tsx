import { useEffect, useMemo, useState, type DragEvent } from "react"
import DayColumn from "./DayColumn"
import costco from "../../assets/images/costco-wholesale.svg"
import dpro from "../../assets/images/DPro.png"
import loblaws from "../../assets/images/loblaws.svg"
import metro from "../../assets/images/metro-inc-logo.svg"
import sobeys from "../../assets/images/sobeys-logo.svg"
import maxland from "../../assets/images/MaxLand.png"
import RoyalAlpha from "../../assets/images/Royal_Alpha.png"
import westernHarvest from "../../assets/images/western_harvest.webp"
import burnacProduce from "../../assets/images/Burnac_Produce.png"
import { useSales, type Client } from "../../Contexts/salesContext"
import { useVegetables, type Vegetable } from "../../Contexts/vegetablesContext"


const suppliers = [
  { id: "costco", name: "Costco", logo: costco },
  { id: "sobeys", name: "Sobeys", logo: sobeys },
  { id: "loblaws", name: "Loblaws", logo: loblaws },
  { id: "dpro", name: "DPro", logo: dpro },
  { id: "metro", name: "Metro", logo: metro },
  { id: "maxland", name: "Maxland", logo: maxland },
  { id: "royalAlpha", name: "Royal Alpha", logo: RoyalAlpha },
  { id: "westernHarvest", name: "Western Harvest", logo: westernHarvest },
  { id : "burnacProduce", name: "Burnac Produce", logo: burnacProduce}
]

type Supplier = (typeof suppliers)[number]

type QuotationDay = {
  key: string
  label: string
  shortDate: string
}

const getDateOnly = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const parseSalesDate = (date: string) => {
  if (!date) {
    return null
  }

  const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch

    return new Date(Number(year), Number(month) - 1, Number(day))
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

const formatQuotationDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const parseQuotationDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)

  return new Date(year, month - 1, day)
}

const formatShortDate = (date: Date) => {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`
}

const getRollingQuotationDays = (today: Date) => {
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

  return Array.from({ length: 3 }, (_, index): QuotationDay => {
    const date = new Date(today)

    date.setDate(today.getDate() + index)

    return {
      key: formatQuotationDate(date),
      label: index === 0 ? "Aujourd'hui" : index === 1 ? "Demain" : dayNames[date.getDay()],
      shortDate: formatShortDate(date),
    }
  }).reverse()
}

const getPastDays = (today: Date) => {
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

  return Array.from({ length: 3 }, (_, index): QuotationDay => {
    const date = new Date(today)

    date.setDate(today.getDate()-1 - index)

    return {
      key: formatQuotationDate(date),
      label: index === 0 ? "Hier" : dayNames[date.getDay()],
      shortDate: formatShortDate(date),
    }
  })
}

const findClientForSupplier = (clients: Client[], supplier: Supplier) => {
  const normalizedSupplierName = supplier.name.toLowerCase()

  return clients.find((client) => client.name.toLowerCase() === normalizedSupplierName)
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
}

type QuotationsByDay = Record<string, Quotation[]>

type SavedQuotation = {
  id: string
  client_id: string
  vegetable_id: number
  price: number | string
  quotation_date: string
}












const Week = () => {
  const [quotationsByDay, setQuotationsByDay] = useState<QuotationsByDay>({})
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const { clients, deleteQuotation, getQuotations, patchQuotation, postQuotation } = useSales()
  const { vegetables } = useVegetables()

  const [todayKey] = useState(() => formatQuotationDate(getDateOnly(new Date())))
  const visibleDays = useMemo(() => getRollingQuotationDays(parseQuotationDate(todayKey)), [todayKey])
  const visiblePastDays = useMemo(() => getPastDays(parseQuotationDate(todayKey)), [todayKey])
  const allDays = useMemo(() => [...visibleDays, ...visiblePastDays], [visibleDays, visiblePastDays])

  const groupedVegetables = useMemo(() => {
    const today = parseQuotationDate(todayKey)
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
  }, [todayKey, vegetables])

  useEffect(() => {
    if (clients.length === 0 || vegetables.length === 0) {
      return
    }

    const visibleDayKeys = new Set(visibleDays.map((day) => day.key))
    const pastDayKeys = new Set(visiblePastDays.map((day) => day.key))

    getQuotations().then((savedQuotations: SavedQuotation[]) => {
      const savedQuotationsByDay = savedQuotations.reduce<QuotationsByDay>(
        (currentQuotationsByDay, savedQuotation) => {
          const parsedQuotationDate = parseSalesDate(savedQuotation.quotation_date)

          if (!parsedQuotationDate) {
            return currentQuotationsByDay
          }

          const quotationDate = formatQuotationDate(parsedQuotationDate)

          if (!visibleDayKeys.has(quotationDate) && !pastDayKeys.has(quotationDate)) {
            return currentQuotationsByDay
          }

          const client = clients.find((currentClient) => currentClient.id === savedQuotation.client_id)
          const supplier = suppliers.find((currentSupplier) => currentSupplier.name === client?.name)
          const vegetable = vegetables.find(
            (currentVegetable) => currentVegetable.id === savedQuotation.vegetable_id,
          )

          if (!supplier || !vegetable) {
            return currentQuotationsByDay
          }

          return {
            ...currentQuotationsByDay,
            [quotationDate]: [
              ...(currentQuotationsByDay[quotationDate] ?? []),
              {
                id: `saved-${savedQuotation.id}`,
                savedQuotationId: savedQuotation.id,
                isSaving: false,
                saveError: null,
                hasUnsavedChanges: false,
                price: String(savedQuotation.price),
                supplier,
                vegetable,
              },
            ],
          }
        },
        {},
      )

      setQuotationsByDay((currentQuotationsByDay) => {
        const nextQuotationsByDay: QuotationsByDay = { ...currentQuotationsByDay }

        Object.entries(savedQuotationsByDay).forEach(([quotationDate, savedQuotations]) => {
          const currentQuotations = nextQuotationsByDay[quotationDate] ?? []

          nextQuotationsByDay[quotationDate] = [
            ...currentQuotations,
            ...savedQuotations.filter(
              (savedQuotation) =>
                !currentQuotations.some(
                  (currentQuotation) =>
                    currentQuotation.savedQuotationId === savedQuotation.savedQuotationId,
                ),
            ),
          ]
        })

        return nextQuotationsByDay
      })
    })
  }, [clients, getQuotations, vegetables, visibleDays, visiblePastDays])

  useEffect(() => {
    Object.entries(quotationsByDay).forEach(([quotationDate, quotations]) => {
      quotations.forEach((quotation) => {
        if (
          !quotation.supplier ||
          !quotation.vegetable ||
          quotation.price.trim() === "" ||
          (quotation.savedQuotationId !== null && !quotation.hasUnsavedChanges) ||
          quotation.isSaving ||
          quotation.saveError !== null ||
          clients.length === 0
        ) {
          return
        }

        const parsedPrice = Number(quotation.price)

        if (!Number.isFinite(parsedPrice)) {
          return
        }

        const client = findClientForSupplier(clients, quotation.supplier)

        if (!client) {
          setQuotationsByDay((currentQuotationsByDay) => ({
            ...currentQuotationsByDay,
            [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) =>
              currentQuotation.id === quotation.id
                ? { ...currentQuotation, saveError: "Client introuvable" }
                : currentQuotation,
            ),
          }))
          return
        }

        setQuotationsByDay((currentQuotationsByDay) => ({
          ...currentQuotationsByDay,
          [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) =>
            currentQuotation.id === quotation.id
              ? { ...currentQuotation, isSaving: true, saveError: null }
              : currentQuotation,
          ),
        }))

        const saveRequest =
          quotation.savedQuotationId === null
            ? postQuotation(client.id, quotation.vegetable.id, parsedPrice, quotationDate)
            : patchQuotation(
                quotation.savedQuotationId,
                client.id,
                quotation.vegetable.id,
                parsedPrice,
                quotationDate,
              )

        saveRequest
          .then((savedQuotation) => {
            setQuotationsByDay((currentQuotationsByDay) => ({
              ...currentQuotationsByDay,
              [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) =>
                {
                  if (currentQuotation.id !== quotation.id) {
                    return currentQuotation
                  }

                  const changedWhileSaving =
                    currentQuotation.price !== quotation.price ||
                    currentQuotation.supplier?.id !== quotation.supplier?.id ||
                    currentQuotation.vegetable?.id !== quotation.vegetable?.id

                  return {
                    ...currentQuotation,
                    savedQuotationId: savedQuotation.id,
                    isSaving: false,
                    saveError: null,
                    hasUnsavedChanges: changedWhileSaving,
                  }
                },
              ),
            }))
          })
          .catch(() => {
            setQuotationsByDay((currentQuotationsByDay) => ({
              ...currentQuotationsByDay,
              [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) =>
                currentQuotation.id === quotation.id
                  ? { ...currentQuotation, isSaving: false, saveError: "Erreur de sauvegarde" }
                  : currentQuotation,
              ),
            }))
          })
      })
    })
  }, [clients, patchQuotation, postQuotation, quotationsByDay])

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

  const handleDayDrop = (event: DragEvent<HTMLDivElement>, dayKey: string) => {
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
      [dayKey]: [
        ...(currentQuotationsByDay[dayKey] ?? []),
        {
          id: `${supplier?.id ?? vegetable?.id}-${dayKey}-${crypto.randomUUID()}`,
          savedQuotationId: null,
          isSaving: false,
          saveError: null,
          hasUnsavedChanges: true,
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
                    hasUnsavedChanges: true,
                    saveError: null,
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
            quotation.id === quotationId
              ? { ...quotation, hasUnsavedChanges: true, price, saveError: null }
              : quotation,
          ),
        ]),
      )
    })
  }

  const handleQuotationDelete = (quotationId: string) => {
    const quotationToDelete = Object.values(quotationsByDay)
      .flat()
      .find((quotation) => quotation.id === quotationId)

    setQuotationsByDay((currentQuotationsByDay) => {
      return Object.fromEntries(
        Object.entries(currentQuotationsByDay).map(([day, quotations]) => [
          day,
          quotations.filter((quotation) => quotation.id !== quotationId),
        ]),
      )
    })

    if (quotationToDelete?.savedQuotationId !== null && quotationToDelete?.savedQuotationId !== undefined) {
      deleteQuotation(quotationToDelete.savedQuotationId).catch(() => {
        console.error("Failed to delete quotation")
      })
    }
  }

  return (
    <section
      className="flex w-full flex-col items-center"
      onDragOver={(event) => autoScrollPageWhileDragging(event.clientY)}
    >
      <h2 className="text-center text-[1.5rem]">Semaine actuelle</h2>

      <div className="grid w-full grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center md:gap-4 md:px-0">
        {suppliers.map((supplier) => (
          <img
            className="h-16 w-full cursor-grab rounded bg-white px-3 py-2 object-contain shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing md:h-20 md:w-40"
            draggable
            key={supplier.id}
            onDragStart={(event) => handleLogoDragStart(event, supplier.id)}
            src={supplier.logo}
            alt={supplier.name}
            title={`Glisser ${supplier.name}`}
          />
        ))}
      </div>
      <div className="mt-5 flex w-full flex-col gap-5 px-3 md:w-[99%] md:px-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center md:gap-4">
          {groupedVegetables.currentlySoldVegetables.map(({ vegetable }) => (
            <article
              className="cursor-grab rounded border-2 border-secondary bg-primary px-3 py-3 text-center text-white shadow-lg ring-2 ring-secondary/25 active:cursor-grabbing md:min-w-44 md:px-5 md:py-4"
              draggable
              key={vegetable.id}
              onDragStart={(event) => handleVegetableDragStart(event, vegetable.id)}
              title={`Glisser ${vegetable.vegetable}`}
            >
              <p className="text-sm font-bold md:text-lg">{vegetable.vegetable}</p>
              <p className="mt-1 text-xs font-semibold text-white/90">En vente</p>
            </article>
          ))}
        </div>

        <div className="border-t border-gray-300 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {groupedVegetables.otherVegetables.map(({ vegetable }) => (
              <p
                className="cursor-grab rounded border border-gray-200 bg-white/60 px-3 py-2 text-xs text-gray-700 active:cursor-grabbing"
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

      <div className="mt-4 flex w-full flex-col md:grid md:grid-cols-3 justify-around  gap-3 px-3 md:w-[99%] md:gap-0 md:px-0">
        {allDays.map((day, index) => (
          <div className="flex flex-col gap-3 md:flex-row md:gap-0" key={day.key}>
            
              <DayColumn
                day={day}
                index={index}
                isDragOver={dragOverDay === day.key}
                key={day.key}
                onQuotationDragOver={handleQuotationDragOver}
                onQuotationDrop={handleQuotationDrop}
                onQuotationDelete={handleQuotationDelete}
                onQuotationPriceChange={handleQuotationPriceChange}
                onDragEnter={setDragOverDay}
                onDragLeave={() => setDragOverDay(null)}
                onDragOver={handleDayDragOver}
                onDrop={handleDayDrop}
                quotations={quotationsByDay[day.key] ?? []}
              />
           
          </div>
        ))}
      </div>
    </section>
  )
}

export default Week
