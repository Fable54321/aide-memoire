import { type Vegetable } from "../../Contexts/vegetablesContext"
import { formatQuotationDate, parseSalesDate } from "./dateUtils"
import { suppliers } from "./suppliers"
import { type Quotation, type QuotationsByDay, type SavedQuotation } from "./types"

export type RecentQuotation = {
  id: string
  supplier: NonNullable<Quotation["supplier"]>
  vegetable: Vegetable
  price: string
  date: Date
  dateKey: string
}

export const buildSavedQuotationsByDay = (
  savedQuotations: SavedQuotation[],
  vegetables: Vegetable[],
  todayKey: string,
  loadedDayKeys: Set<string>,
) => {
  return savedQuotations.reduce<QuotationsByDay>((currentQuotationsByDay, savedQuotation) => {
    const parsedQuotationDate = parseSalesDate(savedQuotation.quotation_date)

    if (!parsedQuotationDate) {
      return currentQuotationsByDay
    }

    const quotationDate = formatQuotationDate(parsedQuotationDate)

    if (quotationDate < todayKey && !loadedDayKeys.has(quotationDate)) {
      return currentQuotationsByDay
    }

    const supplier = suppliers.find((currentSupplier) => String(currentSupplier.id) === String(savedQuotation.client_id))
    const vegetable = vegetables.find((currentVegetable) => currentVegetable.id === savedQuotation.vegetable_id)

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
          createdAt: savedQuotation.created_at ?? savedQuotation.updated_at ?? null,
          supplier,
          vegetable,
        },
      ],
    }
  }, {})
}

export const mergeSavedQuotationsByDay = (
  currentQuotationsByDay: QuotationsByDay,
  savedQuotationsByDay: QuotationsByDay,
  loadedDayKeys: Set<string>,
) => {
  const nextQuotationsByDay: QuotationsByDay = { ...currentQuotationsByDay }
  const hydratedDayKeys = new Set([...loadedDayKeys, ...Object.keys(savedQuotationsByDay)])

  hydratedDayKeys.forEach((quotationDate) => {
    const savedQuotations = savedQuotationsByDay[quotationDate] ?? []
    const currentQuotations = nextQuotationsByDay[quotationDate] ?? []
    const unsavedLocalQuotations = currentQuotations.filter(
      (currentQuotation) =>
        currentQuotation.savedQuotationId === null &&
        !savedQuotations.some(
          (savedQuotation) =>
            savedQuotation.supplier?.id === currentQuotation.supplier?.id &&
            savedQuotation.vegetable?.id === currentQuotation.vegetable?.id &&
            savedQuotation.price === currentQuotation.price,
        ),
    )

    nextQuotationsByDay[quotationDate] = [...unsavedLocalQuotations, ...savedQuotations]
  })

  return nextQuotationsByDay
}

export const getRecentQuotations = (savedQuotations: SavedQuotation[], vegetables: Vegetable[]) => {
  return savedQuotations
    .map((quotation): RecentQuotation | null => {
      const supplier = suppliers.find((currentSupplier) => String(currentSupplier.id) === String(quotation.client_id))
      const vegetable = vegetables.find((currentVegetable) => currentVegetable.id === quotation.vegetable_id)
      const parsedDate = parseSalesDate(quotation.quotation_date)

      if (!supplier || !vegetable || !parsedDate) {
        return null
      }

      return {
        id: quotation.id,
        supplier,
        vegetable,
        price: String(quotation.price),
        date: parsedDate,
        dateKey: formatQuotationDate(parsedDate),
      }
    })
    .filter((quotation): quotation is RecentQuotation => quotation !== null)
    .sort((firstQuotation, secondQuotation) => secondQuotation.date.getTime() - firstQuotation.date.getTime())
}

