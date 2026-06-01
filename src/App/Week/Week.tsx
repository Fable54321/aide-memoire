import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import DayColumn from "./DayColumn"
import costco from "../../assets/images/costco-wholesale.svg"
import dpro from "../../assets/images/DPro.png"
import loblaws from "../../assets/images/loblaws.svg"
import metro from "../../assets/images/metro-inc-logo.svg"
import sobeys from "../../assets/images/sobeys-logo.svg"
import maxland from "../../assets/images/MaxLand.png"
import RoyalAlpha from "../../assets/images/royal_alpha.png"
import westernHarvest from "../../assets/images/western_harvest.webp"
import burnacProduce from "../../assets/images/burnac_produce.png"
import royaltyProduce from "../../assets/images/royalty_produce.png"
import thomas from "../../assets/images/thomas.png"
import yvan from "../../assets/images/yvan_perreault.png"
import jardinsCousineau from "../../assets/images/jardins_cousineau.png"
import trisonFarms from "../../assets/images/trison_farms.png"
import beauvais from "../../assets/images/beauvais.png"
import eagle from "../../assets/images/eagle.png"
import bono from "../../assets/images/bono.png"
import michelriendeau from "../../assets/images/michelriendeau.webp"
import global from "../../assets/images/global.png"
import jardinsagripro from "../../assets/images/jardinsagripro.png"
import fms from "../../assets/images/fms.svg"
import samifruits from "../../assets/images/samifruits.png"
import masetfils from "../../assets/images/masetfils.png"
import { OfflineQueuedRequestError, useSales } from "../../Contexts/salesContext"
import { useVegetables, type Vegetable } from "../../Contexts/vegetablesContext"

const suppliers = [
  { id: 2, name: "Costco", logo: costco },
  { id: 5, name: "Sobeys", logo: sobeys },
  { id: 6, name: "Loblaws", logo: loblaws },
  { id: 3, name: "DPro", logo: dpro },
  { id: 4, name: "Metro", logo: metro },
  { id: 7, name: "Maxland", logo: maxland },
  { id: 8, name: "Royal Alpha", logo: RoyalAlpha },
  { id: 9, name: "Western Harvest", logo: westernHarvest },
  { id: 10, name: "Burnac Produce", logo: burnacProduce },
  { id: 11, name: "Thomas Fruits et Legumes", logo: thomas },
  { id: 12, name: "Yvan Perreault et fils", logo: yvan },
  { id: 13, name: "Trison Farms", logo: trisonFarms },
  { id: 14, name: "Royalty Produce", logo: royaltyProduce },
  { id: 15, name: "Jardins Cousineau", logo: jardinsCousineau },
  { id: 16, name: "Beauvais ltée", logo: beauvais },
  { id: 17, name: "Eagle", logo: eagle },
  { id: 18, name: "Les fermes Michel Riendeau", logo: michelriendeau },
  { id: 19, name: "Bono fruits et légumes", logo: bono },
  { id: 20, name: "Global Produce", logo: global },
  { id: 21, name: "Jardins AgriPro", logo: jardinsagripro },
  { id: 22, name: "FMS", logo: fms },
  { id: 23, name: "Samifruits", logo: samifruits },
  { id: 24, name: "Mas et fils", logo: masetfils },
]

type Supplier = (typeof suppliers)[number]

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

type QuotationsByDay = Record<string, Quotation[]>

type SavedQuotation = {
  id: string
  client_id: string
  vegetable_id: number
  price: number | string
  quotation_date: string
  created_at?: string
  updated_at?: string
}

type DuplicateWarning = {
  supplier: Supplier
  vegetable: Vegetable
  quotation: Quotation
  dayKey: string
  dayLabel: string
}

type UndoAction =
  | { type: "add"; quotationId: string }
  | { type: "replace"; dayKey: string; previousQuotation: Quotation }

const getDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

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
    date.setDate(today.getDate() - 1 - index)

    return {
      key: formatQuotationDate(date),
      label: index === 0 ? "Hier" : dayNames[date.getDay()],
      shortDate: formatShortDate(date),
    }
  })
}

const Week = () => {
  const [quotationsByDay, setQuotationsByDay] = useState<QuotationsByDay>({})
  const [allSavedQuotations, setAllSavedQuotations] = useState<SavedQuotation[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedVegetable, setSelectedVegetable] = useState<Vegetable | null>(null)
  const [draftPrice, setDraftPrice] = useState("")
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const { deleteQuotation, getQuotations, patchQuotation, postQuotation } = useSales()
  const { vegetables } = useVegetables()

  const [todayKey] = useState(() => formatQuotationDate(getDateOnly(new Date())))
  const visibleDays = useMemo(() => getRollingQuotationDays(parseQuotationDate(todayKey)), [todayKey])
  const visiblePastDays = useMemo(() => getPastDays(parseQuotationDate(todayKey)), [todayKey])
  const allDays = useMemo(() => [...visibleDays, ...visiblePastDays], [visibleDays, visiblePastDays])
  const futureQuotationDays = useMemo(
    () =>
      visibleDays
        .filter((day) => day.key !== todayKey)
        .sort((firstDay, secondDay) => parseQuotationDate(firstDay.key).getTime() - parseQuotationDate(secondDay.key).getTime()),
    [todayKey, visibleDays],
  )

  const groupedVegetables = useMemo(() => {
    const today = parseQuotationDate(todayKey)
    const filteredVegetables = vegetables
      .filter((vegetable) => vegetable.vegetable !== "AUCUNE" && vegetable.is_generic === false && vegetable.vegetable !== "ENDIVES")
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
    if (selectedSupplier && selectedVegetable) {
      priceInputRef.current?.focus()
    }
  }, [selectedSupplier, selectedVegetable])

  const loadSavedQuotations = useCallback(() => {
    if (vegetables.length === 0) {
      return
    }

    const visibleDayKeys = new Set(visibleDays.map((day) => day.key))
    const pastDayKeys = new Set(visiblePastDays.map((day) => day.key))

    getQuotations().then((savedQuotations: SavedQuotation[]) => {
      setAllSavedQuotations(savedQuotations)

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

          const supplier = suppliers.find(
            (currentSupplier) => String(currentSupplier.id) === String(savedQuotation.client_id),
          )
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
                createdAt: savedQuotation.created_at ?? savedQuotation.updated_at ?? null,
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

        allDays.forEach(({ key: quotationDate }) => {
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
      })
    })
  }, [allDays, getQuotations, vegetables, visibleDays, visiblePastDays])

  useEffect(() => {
    loadSavedQuotations()
  }, [loadSavedQuotations])

  useEffect(() => {
    window.addEventListener("sales-quotation-queue-synced", loadSavedQuotations)

    return () => {
      window.removeEventListener("sales-quotation-queue-synced", loadSavedQuotations)
    }
  }, [loadSavedQuotations])

  useEffect(() => {
    Object.entries(quotationsByDay).forEach(([quotationDate, quotations]) => {
      quotations.forEach((quotation) => {
        if (
          !quotation.supplier ||
          !quotation.vegetable ||
          quotation.price.trim() === "" ||
          (quotation.savedQuotationId !== null && !quotation.hasUnsavedChanges) ||
          quotation.isSaving ||
          quotation.saveError !== null
        ) {
          return
        }

        const parsedPrice = Number(quotation.price.replace(",", "."))

        if (!Number.isFinite(parsedPrice)) {
          return
        }

        const clientId = String(quotation.supplier.id)

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
            ? postQuotation(clientId, quotation.vegetable.id, parsedPrice, quotationDate)
            : patchQuotation(
                quotation.savedQuotationId,
                clientId,
                quotation.vegetable.id,
                parsedPrice,
                quotationDate,
              )

        saveRequest
          .then((savedQuotation) => {
            setAllSavedQuotations((currentSavedQuotations) => [
              ...currentSavedQuotations.filter((currentQuotation) => currentQuotation.id !== savedQuotation.id),
              savedQuotation,
            ])
            setQuotationsByDay((currentQuotationsByDay) => ({
              ...currentQuotationsByDay,
              [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) => {
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
                  createdAt: currentQuotation.createdAt ?? new Date().toISOString(),
                  hasUnsavedChanges: changedWhileSaving,
                }
              }),
            }))
          })
          .catch((error) => {
            const saveError =
              error instanceof OfflineQueuedRequestError ? "En attente de connexion" : "Erreur de sauvegarde"

            setQuotationsByDay((currentQuotationsByDay) => ({
              ...currentQuotationsByDay,
              [quotationDate]: (currentQuotationsByDay[quotationDate] ?? []).map((currentQuotation) =>
                currentQuotation.id === quotation.id
                  ? {
                      ...currentQuotation,
                      savedQuotationId: error instanceof OfflineQueuedRequestError
                        ? error.queuedQuotationId ?? currentQuotation.savedQuotationId
                        : currentQuotation.savedQuotationId,
                      isSaving: false,
                      saveError,
                      hasUnsavedChanges: false,
                    }
                  : currentQuotation,
              ),
            }))
          })
      })
    })
  }, [patchQuotation, postQuotation, quotationsByDay])

  const recentQuotations = useMemo(() => {
    return allSavedQuotations
      .map((quotation) => {
        const supplier = suppliers.find(
          (currentSupplier) => String(currentSupplier.id) === String(quotation.client_id),
        )
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
      .filter((quotation) => quotation !== null)
      .sort((firstQuotation, secondQuotation) => secondQuotation.date.getTime() - firstQuotation.date.getTime())
  }, [allSavedQuotations, vegetables])

  const selectedClientHistory = useMemo(() => {
    if (!selectedSupplier) {
      return []
    }

    return recentQuotations.filter((quotation) => quotation.supplier.id === selectedSupplier.id).slice(0, 6)
  }, [recentQuotations, selectedSupplier])

  const selectedVegetableHistory = useMemo(() => {
    if (!selectedVegetable) {
      return []
    }

    return recentQuotations.filter((quotation) => quotation.vegetable.id === selectedVegetable.id).slice(0, 6)
  }, [recentQuotations, selectedVegetable])

  const recentPriceSuggestions = useMemo(() => {
    if (!selectedSupplier || !selectedVegetable) {
      return []
    }

    return recentQuotations
      .filter(
        (quotation) =>
          quotation.supplier.id === selectedSupplier.id &&
          quotation.vegetable.id === selectedVegetable.id,
      )
      .slice(0, 3)
  }, [recentQuotations, selectedSupplier, selectedVegetable])

  const getRelativeDayLabel = (dateKey: string) => {
    if (dateKey === todayKey) {
      return "aujourd'hui"
    }

    const foundDay = allDays.find((day) => day.key === dateKey)
    return foundDay?.label.toLowerCase() ?? formatShortDate(parseQuotationDate(dateKey))
  }

  const handleQuotationPriceChange = (quotationId: string, price: string) => {
    setQuotationsByDay((currentQuotationsByDay) => {
      return Object.fromEntries(
        Object.entries(currentQuotationsByDay).map(([day, quotations]) => [
          day,
          quotations.map((quotation) =>
            quotation.id === quotationId
              ? {
                  ...quotation,
                  hasUnsavedChanges: true,
                  price,
                  saveError: null,
                  createdAt: quotation.createdAt ?? new Date().toISOString(),
                }
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

  const saveNewQuotation = (
    event?: FormEvent<HTMLFormElement>,
    replaceQuotation?: Quotation,
    dayKey = todayKey,
  ) => {
    event?.preventDefault()

    if (!selectedSupplier || !selectedVegetable || draftPrice.trim() === "") {
      return
    }

    const existingQuotation =
      replaceQuotation ??
      quotationsByDay[dayKey]?.find(
        (quotation) =>
          quotation.supplier?.id === selectedSupplier.id &&
          quotation.vegetable?.id === selectedVegetable.id,
      )

    if (existingQuotation && !replaceQuotation) {
      const day = allDays.find((currentDay) => currentDay.key === dayKey)
      setDuplicateWarning({
        supplier: selectedSupplier,
        vegetable: selectedVegetable,
        quotation: existingQuotation,
        dayKey,
        dayLabel: day?.label.toLowerCase() ?? formatShortDate(parseQuotationDate(dayKey)),
      })
      return
    }

    const createdAt = new Date().toISOString()

    if (replaceQuotation) {
      const previousQuotation = { ...replaceQuotation }

      setQuotationsByDay((currentQuotationsByDay) => ({
        ...currentQuotationsByDay,
        [dayKey]: (currentQuotationsByDay[dayKey] ?? []).map((quotation) =>
          quotation.id === replaceQuotation.id
            ? {
                ...quotation,
                hasUnsavedChanges: true,
                saveError: null,
                price: draftPrice,
                createdAt,
              }
            : quotation,
        ),
      }))
      setUndoAction({ type: "replace", dayKey, previousQuotation })
      setSaveNotice("Soumission remplacee.")
    } else {
      const quotationId = `${selectedSupplier.id}-${selectedVegetable.id}-${dayKey}-${crypto.randomUUID()}`

      setQuotationsByDay((currentQuotationsByDay) => ({
        ...currentQuotationsByDay,
        [dayKey]: [
          {
            id: quotationId,
            savedQuotationId: null,
            isSaving: false,
            saveError: null,
            hasUnsavedChanges: true,
            supplier: selectedSupplier,
            vegetable: selectedVegetable,
            price: draftPrice,
            createdAt,
          },
          ...(currentQuotationsByDay[dayKey] ?? []),
        ],
      }))
      setUndoAction({ type: "add", quotationId })
      setSaveNotice(dayKey === todayKey ? "Soumission ajoutee." : "Soumission ajoutee pour une prochaine journee.")
    }

    setDraftPrice("")
    setDuplicateWarning(null)
    priceInputRef.current?.focus()
  }

  const handleUndo = () => {
    if (!undoAction) {
      return
    }

    if (undoAction.type === "add") {
      handleQuotationDelete(undoAction.quotationId)
    } else {
      setQuotationsByDay((currentQuotationsByDay) => ({
        ...currentQuotationsByDay,
        [undoAction.dayKey]: (currentQuotationsByDay[undoAction.dayKey] ?? []).map((quotation) =>
          quotation.id === undoAction.previousQuotation.id
            ? { ...undoAction.previousQuotation, hasUnsavedChanges: true }
            : quotation,
        ),
      }))
    }

    setUndoAction(null)
    setSaveNotice(null)
  }

  return (
    <section className="flex w-full flex-col items-center">
      

      <div className=" mt-5 grid w-full grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center md:gap-4 md:px-0">
        {suppliers.map((supplier) => (
          <button
            className={`pickable-choice h-16 w-full rounded bg-white px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:cursor-pointer md:h-20 md:w-40 ${
              !selectedSupplier ? "pickable-choice--prompt" : ""
            } ${
              selectedSupplier?.id === supplier.id ? "ring-4 ring-primary" : ""
            }`}
            key={supplier.id}
            onClick={() => setSelectedSupplier(supplier)}
            title={supplier.name}
            type="button"
          >
            <img
              className="h-full w-full object-contain"
              src={supplier.logo}
              alt={supplier.name}
            />
          </button>
        ))}
      </div>

      <div className="mt-5 flex w-full flex-col gap-5 px-3 md:w-[99%] md:px-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center md:gap-4">
          {groupedVegetables.currentlySoldVegetables.map(({ vegetable }) => (
            <button
              className={`pickable-choice rounded border-2 border-secondary bg-primary px-3 py-3 text-center text-white shadow-lg ring-2 hover:cursor-pointer ring-secondary/25 md:min-w-44 md:px-5 md:py-4 ${
                !selectedVegetable ? "pickable-choice--prompt pickable-choice--produce" : ""
              } ${
                selectedVegetable?.id === vegetable.id ? "outline-4 outline-offset-2 outline-secondary" : ""
              }`}
              key={vegetable.id}
              onClick={() => setSelectedVegetable(vegetable)}
              title={vegetable.vegetable}
              type="button"
            >
              <p className="text-sm font-bold md:text-lg">{vegetable.vegetable}</p>
              <p className="mt-1 text-xs font-semibold text-white/90">En vente</p>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-300 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {groupedVegetables.otherVegetables
            .map(({ vegetable }) => (
              <button
                className={`rounded border border-gray-200 bg-white/60 px-3 py-2 text-left text-xs text-gray-700 hover:cursor-pointer ${
                  selectedVegetable?.id === vegetable.id ? "ring-2 ring-secondary" : ""
                }`}
                key={vegetable.id}
                onClick={() => setSelectedVegetable(vegetable)}
                title={vegetable.vegetable}
                type="button"
              >
                {vegetable.vegetable}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        className="mt-5 grid w-[calc(100%-1.5rem)] gap-3 rounded border-2 border-secondary bg-white p-4 shadow-md md:w-[min(980px,99%)] md:grid-cols-[1fr_1fr_150px_auto] md:items-end"
        onSubmit={saveNewQuotation}
      >
        <label className="flex flex-col gap-1 text-sm font-bold text-secondary">
          Client
          <input
            className="rounded border border-gray-300 bg-tertiary px-3 py-3 text-base text-gray-900"
            placeholder="Choisir un client"
            readOnly
            value={selectedSupplier?.name ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-secondary">
          Produit
          <input
            className="rounded border border-gray-300 bg-tertiary px-3 py-3 text-base text-gray-900"
            placeholder="Choisir un produit"
            readOnly
            value={selectedVegetable?.vegetable ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-secondary">
          Prix
          <input
            className="rounded border-2 border-secondary px-3 py-3 text-center text-3xl font-bold outline-primary"
            inputMode="decimal"
            onChange={(event) => setDraftPrice(event.target.value)}
            placeholder="32"
            ref={priceInputRef}
            type="text"
            value={draftPrice}
          />
        </label>
        <div className="grid gap-2">
          <button
            className="button-generic-light h-14 disabled:opacity-40"
            disabled={!selectedSupplier || !selectedVegetable || draftPrice.trim() === ""}
            type="submit"
          >
            Ajouter aujourd'hui
          </button>
          <div className="grid grid-cols-2 gap-2">
            {futureQuotationDays.map((day) => (
              <button
                className="rounded border border-secondary px-3 py-2 text-sm font-bold text-secondary transition hover:bg-tertiary disabled:opacity-40"
                disabled={!selectedSupplier || !selectedVegetable || draftPrice.trim() === ""}
                key={day.key}
                onClick={() => saveNewQuotation(undefined, undefined, day.key)}
                type="button"
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-4">
          {recentPriceSuggestions.length > 0 && (
            <p className="text-sm font-semibold text-gray-700">
              Recent:{" "}
              {recentPriceSuggestions
                .map((quotation) => `${quotation.price} ${getRelativeDayLabel(quotation.dateKey)}`)
                .join(", ")}
            </p>
          )}
          {duplicateWarning && (
            <div className="mt-2 flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 md:flex-row md:items-center md:justify-between">
              <span>
                {duplicateWarning.supplier.name} a deja {duplicateWarning.vegetable.vegetable} {duplicateWarning.dayLabel} a{" "}
                <strong>{duplicateWarning.quotation.price}</strong>. Remplacer?
              </span>
              <div className="flex gap-2">
                <button
                  className="button-generic-light"
                  onClick={() =>
                    saveNewQuotation(undefined, duplicateWarning.quotation, duplicateWarning.dayKey)
                  }
                  type="button"
                >
                  Remplacer
                </button>
                <button
                  className="rounded border border-gray-300 px-3 py-2 font-semibold"
                  onClick={() => setDuplicateWarning(null)}
                  type="button"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {saveNotice && (
            <p className="mt-2 text-sm font-semibold text-secondary">
              {saveNotice}{" "}
              <button className="underline" onClick={handleUndo} type="button">
                Annuler
              </button>
            </p>
          )}
        </div>
      </form>

      <div className="mt-4 grid w-[calc(100%-1.5rem)] gap-3 md:w-[99%] md:grid-cols-2">
        {selectedSupplier && (
          <section className="rounded border border-secondary/30 bg-white p-4">
            <h3 className="text-lg font-bold text-secondary">
              {selectedSupplier.name} - soumissions recentes
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {selectedClientHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun historique.</p>
              ) : (
                selectedClientHistory.map((quotation) => (
                  <p className="flex justify-between gap-3 text-[1.3em]" key={quotation.id}>
                    <span>
                      {getRelativeDayLabel(quotation.dateKey)} - {quotation.vegetable.vegetable}
                    </span>
                    <strong>{quotation.price}</strong>
                  </p>
                ))
              )}
            </div>
          </section>
        )}
        {selectedVegetable && (
          <section className="rounded border border-secondary/30 bg-white p-4">
            <h3 className="text-lg font-bold text-secondary">
              {selectedVegetable.vegetable} - prix recents
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {selectedVegetableHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun historique.</p>
              ) : (
                selectedVegetableHistory.map((quotation) => (
                  <p className="flex justify-between gap-3 text-[1.3em] " key={quotation.id}>
                    <span>
                      {quotation.supplier.name} - {getRelativeDayLabel(quotation.dateKey)}
                    </span>
                    <strong>{quotation.price}</strong>
                  </p>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <div className="mt-4 flex w-full flex-col justify-around gap-3 px-3 md:grid md:w-[99%] md:grid-cols-3 md:gap-0 md:px-0">
        {allDays.map((day, index) => (
          <div className="flex flex-col gap-3 md:flex-row md:gap-0" key={day.key}>
            <DayColumn
              day={day}
              index={index}
              onQuotationDelete={handleQuotationDelete}
              onQuotationPriceChange={handleQuotationPriceChange}
              quotations={quotationsByDay[day.key] ?? []}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Week
