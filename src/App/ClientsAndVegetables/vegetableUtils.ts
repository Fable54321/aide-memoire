import { type Vegetable } from "../../Contexts/vegetablesContext"
import { parseSalesDate } from "./dateUtils"

const isDateBetween = (date: Date, startDate: string, endDate: string) => {
  const parsedStartDate = parseSalesDate(startDate)
  const parsedEndDate = parseSalesDate(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return false
  }

  return date >= parsedStartDate && date <= parsedEndDate
}

const sortVegetablesByName = <T extends { vegetable: Vegetable }>(vegetables: T[]) => {
  return vegetables.sort((firstVegetable, secondVegetable) =>
    firstVegetable.vegetable.vegetable.localeCompare(secondVegetable.vegetable.vegetable),
  )
}

export const groupVegetablesForQuotation = (vegetables: Vegetable[], today: Date) => {
  const filteredVegetables = vegetables
    .filter((vegetable) => vegetable.vegetable !== "AUCUNE" && vegetable.is_generic === false && vegetable.vegetable !== "ENDIVES")
    .map((vegetable) => ({
      isCurrentlySold:
        isDateBetween(today, vegetable.sales_debut_1, vegetable.sales_end_1) ||
        isDateBetween(today, vegetable.sales_debut_2, vegetable.sales_end_2),
      vegetable,
    }))

  return {
    currentlySoldVegetables: sortVegetablesByName(filteredVegetables.filter(({ isCurrentlySold }) => isCurrentlySold)),
    otherVegetables: sortVegetablesByName(filteredVegetables.filter(({ isCurrentlySold }) => !isCurrentlySold)),
  }
}

