import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import DayColumn from "./DayColumn"
import { OfflineQueuedRequestError, useSales } from "../../Contexts/salesContext"
import { useVegetables, type Vegetable } from "../../Contexts/vegetablesContext"
import { ChevronDownIcon } from "lucide-react"
import {
  addDays,
  addMonths,
  formatCalendarMonth,
  formatQuotationDate,
  formatShortDate,
  getCalendarDays,
  getDateOnly,
  getMonthStart,
  getPastDays,
  getQuotationDay,
  getRollingQuotationDays,
  parseQuotationDate,
  sortQuotationDaysByDate,
} from "./dateUtils"
import { buildSavedQuotationsByDay, getRecentQuotations, mergeSavedQuotationsByDay } from "./quotationUtils"
import { suppliers } from "./suppliers"
import { type DuplicateWarning, type Quotation, type QuotationsByDay, type SavedQuotation, type Supplier, type UndoAction } from "./types"
import { groupVegetablesForQuotation } from "./vegetableUtils"

const ClientsAndVegetables = () => {
  const [quotationsByDay, setQuotationsByDay] = useState<QuotationsByDay>({})
  const [allSavedQuotations, setAllSavedQuotations] = useState<SavedQuotation[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedVegetable, setSelectedVegetable] = useState<Vegetable | null>(null)
  const [draftPrice, setDraftPrice] = useState("")
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const calendarPickerRef = useRef<HTMLDivElement>(null)
  const { deleteQuotation, getQuotations, patchQuotation, postQuotation } = useSales()
  const { vegetables } = useVegetables()

  const [todayKey] = useState(() => formatQuotationDate(getDateOnly(new Date())))
  const [earliestCalendarDateKey] = useState(() => formatQuotationDate(addDays(getDateOnly(new Date()), 3)))
  const [selectedQuotationDate, setSelectedQuotationDate] = useState(earliestCalendarDateKey)
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(parseQuotationDate(earliestCalendarDateKey)))
  const visibleDays = useMemo(() => getRollingQuotationDays(parseQuotationDate(todayKey)), [todayKey])
  const quickQuotationDays = useMemo(() => sortQuotationDaysByDate(visibleDays).slice(1, 3), [visibleDays])
  const [futureDaysShown, setFutureDaysShown] = useState(8)
  const visibleFutureDays = useMemo(() => visibleDays.slice(visibleDays.length - futureDaysShown, visibleDays.length), [visibleDays, futureDaysShown])
  const visiblePastDays = useMemo(() => getPastDays(parseQuotationDate(todayKey)), [todayKey])
  const loadedDays = useMemo(() => sortQuotationDaysByDate([...visibleFutureDays, ...visiblePastDays]), [visibleFutureDays, visiblePastDays])
  const loadedDayKeys = useMemo(() => new Set(loadedDays.map((day) => day.key)), [loadedDays])
  const selectedQuotationDay = useMemo(
    () => getQuotationDay(selectedQuotationDate || todayKey, todayKey),
    [selectedQuotationDate, todayKey],
  )
  const allDays = useMemo(() => {
    const daysByKey = new Map(
      [...loadedDays, selectedQuotationDay].map((day) => [day.key, day]),
    )

    return sortQuotationDaysByDate([...daysByKey.values()])
  }, [loadedDays, selectedQuotationDay])
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth])
  const outOfRangeQuotationDays = useMemo(() => {
    return sortQuotationDaysByDate(
      Object.entries(quotationsByDay)
        .filter(([dayKey, quotations]) => dayKey >= todayKey && !loadedDayKeys.has(dayKey) && quotations.length > 0)
        .map(([dayKey]) => getQuotationDay(dayKey, todayKey)),
    )
  }, [loadedDayKeys, quotationsByDay, todayKey])

  const groupedVegetables = useMemo(
    () => groupVegetablesForQuotation(vegetables, parseQuotationDate(todayKey)),
    [todayKey, vegetables],
  )

  useEffect(() => {
    if (selectedSupplier && selectedVegetable) {
      priceInputRef.current?.focus()
    }
  }, [selectedSupplier, selectedVegetable])

  useEffect(() => {
    if (!isCalendarOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (calendarPickerRef.current?.contains(event.target as Node)) {
        return
      }

      setIsCalendarOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCalendarOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isCalendarOpen])

  const loadSavedQuotations = useCallback(() => {
    if (vegetables.length === 0) {
      return
    }

    getQuotations().then((savedQuotations: SavedQuotation[]) => {
      setAllSavedQuotations(savedQuotations)

      const savedQuotationsByDay = buildSavedQuotationsByDay(savedQuotations, vegetables, todayKey, loadedDayKeys)

      setQuotationsByDay((currentQuotationsByDay) =>
        mergeSavedQuotationsByDay(currentQuotationsByDay, savedQuotationsByDay, loadedDayKeys),
      )
    })
  }, [getQuotations, loadedDayKeys, todayKey, vegetables])

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

  const recentQuotations = useMemo(
    () => getRecentQuotations(allSavedQuotations, vegetables),
    [allSavedQuotations, vegetables],
  )

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

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier((currentSupplier) => currentSupplier?.id === supplier.id ? null : supplier)
    setDuplicateWarning(null)
  }

  const handleVegetableSelect = (vegetable: Vegetable) => {
    setSelectedVegetable((currentVegetable) => currentVegetable?.id === vegetable.id ? null : vegetable)
    setDuplicateWarning(null)
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
            onClick={() => handleSupplierSelect(supplier)}
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
              onClick={() => handleVegetableSelect(vegetable)}
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
                onClick={() => handleVegetableSelect(vegetable)}
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
        className="relative mt-5 flex w-[calc(100%-1.5rem)] flex-col items-stretch gap-3 rounded border-2 border-secondary bg-white p-3 shadow-md sm:p-4 md:w-[min(1080px,99%)] md:flex-row md:items-start md:gap-4 md:pb-10"
        onSubmit={saveNewQuotation}
      >
        <div className="flex w-full flex-col justify-center gap-2 md:my-auto md:flex-1">
        <label className="flex flex-col gap-1 font-bold text-secondary">
          Client
          <input
            className="w-full min-w-0 rounded border border-gray-300 bg-tertiary px-3 py-3 text-base text-gray-900 sm:text-[1.3em]"
            placeholder="Choisir un client"
            readOnly
            value={selectedSupplier?.name ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1 font-bold text-secondary">
          Produit
          <input
            className="w-full min-w-0 rounded border border-gray-300 bg-tertiary px-3 py-3 text-base text-gray-900 sm:text-[1.3em]"
            placeholder="Choisir un produit"
            readOnly
            value={selectedVegetable?.vegetable ?? ""}
          />
        </label>
        </div>
        <label className="flex w-full flex-col gap-1 font-bold text-secondary md:my-auto md:max-w-30">
          Prix
          <input
            className="w-full rounded border-2 placeholder:text-secondary/20 border-secondary px-3 py-3 text-center text-3xl font-bold outline-primary"
            inputMode="decimal"
            onChange={(event) => setDraftPrice(event.target.value)}
            placeholder="32"
            ref={priceInputRef}
            type="text"
            value={draftPrice}
          />
        </label>
        <div className="grid w-full gap-2 rounded border border-secondary/20 bg-tertiary p-3 md:flex-1">
          <button
            className="button-generic-light min-h-14 disabled:opacity-40"
            disabled={!selectedSupplier || !selectedVegetable || draftPrice.trim() === ""}
            type="submit"
          >
            Ajouter aujourd'hui
          </button>
          <div className="grid grid-cols-2 gap-2">
            {quickQuotationDays
            .map((day) => (
              <button
                className="rounded border border-secondary px-3 py-2 text-sm font-bold text-secondary transition hover:bg-tertiary disabled:opacity-40"
                disabled={!selectedSupplier || !selectedVegetable || draftPrice.trim() === ""}
                key={day.key}
                onClick={() => {
                  setIsCalendarOpen(false)
                  saveNewQuotation(undefined, undefined, day.key)
                }}
                type="button"
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="relative mt-1 border-t border-secondary/15 pt-2" ref={calendarPickerRef}>
            <button
              className="flex min-h-12 w-full hover:cursor-pointer items-center justify-between gap-3 rounded border border-secondary/30 bg-white px-3 py-2 text-left font-bold text-secondary shadow-sm transition hover:bg-tertiary"
              onClick={() => {
                setCalendarMonth(getMonthStart(parseQuotationDate(selectedQuotationDate || todayKey)))
                setIsCalendarOpen((currentValue) => !currentValue)
              }}
              type="button"
            >
              <span className="text-sm">Choisir une autre date</span>
              
                <span aria-hidden="true" className="text-base leading-none"><ChevronDownIcon /></span>
              
            </button>

            {isCalendarOpen && (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] -translate-x-1/2 rounded border-2 border-secondary bg-white p-3 shadow-2xl md:left-auto md:right-0 md:translate-x-0">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="h-11 w-11 hover:cursor-pointer rounded border border-secondary/30 bg-white text-lg font-black text-secondary transition hover:bg-tertiary disabled:opacity-30"
                    disabled={formatQuotationDate(calendarMonth) <= formatQuotationDate(getMonthStart(parseQuotationDate(earliestCalendarDateKey)))}
                    onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, -1))}
                    type="button"
                  >
                    {"<"}
                  </button>
                  <p className="text-center text-base font-black capitalize text-secondary">
                    {formatCalendarMonth(calendarMonth)}
                  </p>
                  <button
                    className="h-11 w-11 hover:cursor-pointer rounded border border-secondary/30 bg-white text-lg font-black text-secondary transition hover:bg-tertiary"
                    onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, 1))}
                    type="button"
                  >
                    {">"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-black uppercase text-secondary/70">
                  {["L", "M", "M", "J", "V", "S", "D"].map((dayName, index) => (
                    <span key={`${dayName}-${index}`}>{dayName}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarDays.map((date) => {
                    const dateKey = formatQuotationDate(date)
                    const isSelected = dateKey === selectedQuotationDate
                    const isToday = dateKey === todayKey
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
                    const isBeforeCalendarRange = dateKey < earliestCalendarDateKey

                    return (
                      <button
                        className={`min-h-11 rounded hover:cursor-pointer border text-base font-black transition disabled:cursor-default disabled:opacity-25 ${
                          isSelected
                            ? "border-secondary bg-secondary text-white shadow-sm"
                            : isToday
                              ? "border-primary bg-white text-secondary ring-2 ring-primary/40"
                              : isCurrentMonth
                                ? "border-secondary/20 bg-white text-secondary hover:bg-tertiary"
                                : "border-gray-200 bg-white/50 text-gray-400 hover:bg-white"
                        }`}
                        disabled={isBeforeCalendarRange}
                        key={dateKey}
                        onClick={() => {
                          setSelectedQuotationDate(dateKey)
                          setDuplicateWarning(null)
                          setIsCalendarOpen(false)
                        }}
                        type="button"
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 rounded bg-tertiary px-2 py-1.5 text-center text-xs font-bold text-secondary">
                  Selection: {selectedQuotationDay.label.toLowerCase()} {selectedQuotationDay.shortDate}
                </p>
                <button
                  className="mt-3 w-full rounded border border-secondary bg-white px-3 py-2 text-sm font-bold text-secondary transition hover:bg-tertiary disabled:opacity-40"
                  disabled={!selectedSupplier || !selectedVegetable || draftPrice.trim() === ""}
                  onClick={() => {
                    setIsCalendarOpen(false)
                    saveNewQuotation(undefined, undefined, selectedQuotationDate)
                  }}
                  type="button"
                >
                  Ajouter pour cette date
                </button>
              </div>
            )}
            </div>
        </div>

        <div className="w-full md:absolute md:bottom-2 md:left-4 md:w-[calc(100%-2rem)]">
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
                  <p className="flex flex-col gap-1 text-base sm:flex-row sm:justify-between sm:gap-3 sm:text-[1.3em]" key={quotation.id}>
                    <span className="min-w-0 wrap-break-word">
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
                  <p className="flex flex-col gap-1 text-base sm:flex-row sm:justify-between sm:gap-3 sm:text-[1.3em]" key={quotation.id}>
                    <span className="min-w-0 wrap-break-word">
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
        {loadedDays.map((day, index) => (
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
      {outOfRangeQuotationDays.length > 0 && (
        <div className="mt-4 flex w-[calc(100%-1.5rem)] flex-wrap justify-end gap-3 md:w-[99%]">
          {outOfRangeQuotationDays.map((day) => (
            <div className="w-full max-w-sm md:w-80" key={day.key}>
              <DayColumn
                compact
                day={day}
                index={1}
                onQuotationDelete={handleQuotationDelete}
                onQuotationPriceChange={handleQuotationPriceChange}
                quotations={quotationsByDay[day.key] ?? []}
              />
            </div>
          ))}
        </div>
      )}
       <button
          className="rounded border border-gray-300 px-3 py-2 font-semibold hover:cursor-pointer"
          onClick={() => setFutureDaysShown((prev) => Math.min(prev + 9))}
          type="button"
        >
          Voir plus
        </button>
    </section>
  )
}

export default ClientsAndVegetables
