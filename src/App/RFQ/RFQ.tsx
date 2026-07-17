import { useState } from "react"
import { rfqSuppliers } from "../ClientsAndVegetables/suppliers"
import { useRfq } from "../../Contexts/rfqContext"

type RfqSupplier = (typeof rfqSuppliers)[number]

const loblawsLocations = [
  { code: "B", name: "Boucherville" },
  { code: "C", name: "Caledonia (maritime)" },
  { code: "M", name: "Maplegrove (Ontario)" },
  { code: "W", name: "Ouest canadien" },
] as const

const metroLocations = [
  { code: "M", name: "Montréal (ZP 01)" },
  { code: "T", name: "Toronto (ZP 03)" },
] as const

const sobeysLocations = [
  { code: "B", name: "Boucherville" },
  { code: "Q", name: "Québec" },
  { code: "O", name: "Ontario", details: ["Debert", "Witby"] },
  { code: "W", name: "West canadien", details: ["Campbell", "Winnipeg", "Calgary", "Edmonton"] },
  { code: "A", name: "Atlantique", details: ["Mt-Pearl"] },
] as const

const monthNames = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
]

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getMonday = (date: Date) => {
  const day = date.getDay() || 7
  return addDays(date, 1 - day)
}

const getIsoWeek = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const formatWeekRange = (start: Date, end: Date) => {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} au ${end.getDate()} ${monthNames[end.getMonth()]}`
  }

  return `${start.getDate()} ${monthNames[start.getMonth()]} au ${end.getDate()} ${monthNames[end.getMonth()]}`
}

const RFQ = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<RfqSupplier>(rfqSuppliers[0])
  const { productsByClient, loadingByClient, errorsByClient, loadClientProducts } = useRfq()
  const products = productsByClient[selectedSupplier.id] ?? []
  const isLoading = loadingByClient[selectedSupplier.id]
  const error = errorsByClient[selectedSupplier.id]
  const isMetro = selectedSupplier.id === 4
  const isSobeys = selectedSupplier.id === 5
  const locations = isMetro
    ? metroLocations
    : isSobeys
      ? sobeysLocations
      : loblawsLocations
  const weeks = Array.from({ length: isMetro ? 12 : isSobeys ? 6 : 8 }, (_, index) => {
    const start = addDays(getMonday(new Date()), index * 7)
    const end = addDays(start, 6)
    return {
      number: getIsoWeek(start),
      title: isSobeys
        ? `SF ${addDays(end, 4).getDate()} ${monthNames[addDays(end, 4).getMonth()]}`
        : isMetro
          ? null
          : `SE ${getIsoWeek(start)}`,
      label: isMetro
        ? `${start.getDate()} ${monthNames[start.getMonth()]}`
        : formatWeekRange(start, end),
    }
  })
  const alternateWeekColor = isMetro
    ? "bg-orange-100"
    : isSobeys
      ? "bg-fuchsia-100"
      : "bg-green-100"
  const clientAccentColor = isSobeys ? "text-fuchsia-800" : "text-secondary"

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

      <div className="mt-6 rounded-lg border-2 border-secondary bg-white p-3 shadow-md sm:p-5">
        <div className="mb-4">
          <h3 className={`text-xl font-bold uppercase ${clientAccentColor}`}>
            {selectedSupplier.name}
          </h3>
          <p className={`text-sm font-bold ${clientAccentColor}`}>RFQ complétés</p>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-600">Chargement des produits...</p>
        ) : error ? (
          <div className="py-8 text-center text-sm">
            <p className="text-red-700" role="alert">{error}</p>
            <button
              className="mt-3 cursor-pointer font-bold text-secondary underline"
              onClick={() => void loadClientProducts(selectedSupplier.id)}
              type="button"
            >
              Réessayer
            </button>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="overflow-x-auto pb-2">
              <table className="w-max min-w-full table-fixed border-collapse text-sm text-black">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-56 min-w-56 bg-white" rowSpan={2}>
                      <span className="sr-only">Produits</span>
                    </th>
                    {weeks.map((week, weekIndex) => (
                      <th
                        className={`border-2 border-black px-1 py-2 text-center ${
                          weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                        }`}
                        colSpan={locations.length}
                        key={`${week.number}-${weekIndex}`}
                        scope="colgroup"
                      >
                        {week.title && (
                          <span className="block text-base font-extrabold">{week.title}</span>
                        )}
                        <span
                          className={`block whitespace-nowrap font-bold ${isMetro ? "text-xs" : "text-[10px]"}`}
                        >
                          {week.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {weeks.flatMap((week, weekIndex) =>
                      locations.map((location, locationIndex) => (
                        <th
                          className={`h-6 w-6 min-w-6 border-y-2 border-black text-center font-extrabold ${
                            locationIndex === 0 ? "border-l-2" : "border-l border-l-black/60"
                          } ${locationIndex === locations.length - 1 ? "border-r-2" : ""} ${
                            weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                          }`}
                          key={`${week.number}-${weekIndex}-${location.code}`}
                          scope="col"
                          title={location.name}
                        >
                          {location.code}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <th
                        className={`sticky left-0 z-10 h-6 w-56 min-w-56 border border-black bg-white px-2 text-left font-normal ${
                          isSobeys ? "text-fuchsia-800" : ""
                        }`}
                        scope="row"
                      >
                        {product.name}
                      </th>
                      {weeks.flatMap((week, weekIndex) =>
                        locations.map((location, locationIndex) => (
                          <td
                            aria-label={`${product.name}, semaine ${week.number}, ${location.name}`}
                            className={`h-6 w-6 min-w-6 border-y border-black/60 ${
                              locationIndex === 0 ? "border-l-2 border-l-black" : "border-l border-l-black/40"
                            } ${locationIndex === locations.length - 1 ? "border-r-2 border-r-black" : ""} ${
                              weekIndex % 2 === 0 ? alternateWeekColor : "bg-white"
                            }`}
                            key={`${product.id}-${week.number}-${weekIndex}-${location.code}`}
                          />
                        )),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className={`mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 ${
                locations.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
              }`}
            >
              {locations.map((location) => (
                <div key={location.code}>
                  <p><strong>{location.code}</strong> = {location.name}</p>
                  {"details" in location && location.details?.map((detail) => (
                    <p className="pl-4" key={detail}>{detail}</p>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-gray-600">
            Aucun produit actif pour {selectedSupplier.name}.
          </p>
        )}
      </div>
    </section>
  )
}

export default RFQ
