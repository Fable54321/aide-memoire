import { useState } from "react"
import { CalendarDays, ListChecks } from "lucide-react"
import { rfqSuppliers } from "../ClientsAndVegetables/suppliers"

type RfqSupplier = (typeof rfqSuppliers)[number]

const RFQ = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<RfqSupplier>(rfqSuppliers[0])

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

      <div className="mt-6 rounded-lg border-2 border-secondary bg-white p-4 shadow-md sm:p-6">
        <h3 className="text-xl font-bold text-secondary">{selectedSupplier.name}</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="min-h-44 rounded-lg border border-secondary/25 bg-tertiary p-4">
            <div className="flex items-center gap-2 font-bold text-secondary">
              <CalendarDays aria-hidden="true" size={22} />
              <h4>Calendrier</h4>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Le calendrier RFQ de {selectedSupplier.name} apparaîtra ici.
            </p>
          </section>

          <section className="min-h-44 rounded-lg border border-secondary/25 bg-tertiary p-4">
            <div className="flex items-center gap-2 font-bold text-secondary">
              <ListChecks aria-hidden="true" size={22} />
              <h4>Liste de produits</h4>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Les produits RFQ de {selectedSupplier.name} apparaîtront ici.
            </p>
          </section>
        </div>
      </div>
    </section>
  )
}

export default RFQ
