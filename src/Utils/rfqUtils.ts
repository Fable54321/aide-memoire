import { rfqSuppliers } from "../App/ClientsAndVegetables/suppliers"

export type RfqSupplier = (typeof rfqSuppliers)[number]

export type SelectedRfqCell = {
  productId: number
  productName: string
  weekStart: string
  weekLabel: string
  locationCode: string
  locationName: string
}

export const getRfqClientConfig = (supplierId: number) => {
  const isMetro = supplierId === 4
  const isSobeys = supplierId === 5

  return {
    isMetro,
    isSobeys,
    clientKey: isMetro ? "metro" : isSobeys ? "sobeys" : "loblaws",
    clientAccentColor: isSobeys ? "text-fuchsia-800" : "text-secondary",
    managementLabel: isMetro
      ? "Gérer les produits (Metro)"
      : isSobeys
        ? "Gérer les produits (Sobeys)"
        : "Gérer les produits (Loblaws)",
  } as const
}
