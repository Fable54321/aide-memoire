
import { createContext, useContext, useState, useEffect, useRef, type ReactNode, useCallback } from "react"


export type Client = {
    id: string,
    name: string,
}


type Quotation = {
    id: string,
    client_id: string,
    vegetable_id: number,
    price: number | string,
    quotation_date: string,
}

type QueuedQuotationRequest =
    | {
        id: string,
        type: "post",
        payload: {
            clientId: string,
            vegetableId: number,
            price: number,
            date: string,
        },
    }
    | {
        id: string,
        type: "patch",
        payload: {
            quotationId: string,
            clientId: string,
            vegetableId: number,
            price: number,
            date: string,
        },
    }
    | {
        id: string,
        type: "delete",
        payload: {
            quotationId: string,
        },
    }

type SalesContextType = {
    clients: Client[],
    setClients: React.Dispatch<React.SetStateAction<Client[]>>,
    getQuotations: () => Promise<Quotation[]>,
    postQuotation: (
        clientId: string,
        vegetableId: number,
        price: number,
        date: string,
    ) => Promise<Quotation>,
    patchQuotation: (
        quotationId: string,
        clientId: string,
        vegetableId: number,
        price: number,
        date: string,
    ) => Promise<Quotation>,
    deleteQuotation: (
        quotationId: string,
    ) => Promise<Quotation>
}


type SalesProviderProps = {
    children: ReactNode
}

const SalesContext = createContext<SalesContextType>({} as SalesContextType)
const quotationQueueStorageKey = "vegibec-pending-quotation-requests"

// eslint-disable-next-line react-refresh/only-export-components
export class OfflineQueuedRequestError extends Error {
    queuedQuotationId?: string

    constructor(queuedQuotationId?: string) {
        super("Request queued until the internet connection is back")
        this.name = "OfflineQueuedRequestError"
        this.queuedQuotationId = queuedQuotationId
    }
}

const parseJsonResponse = async <T,>(response: Response): Promise<T> => {
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data?.error ?? "Request failed")
    }

    return data
}

const isNetworkError = (error: unknown) => {
    return !navigator.onLine || error instanceof TypeError
}

const readQueuedQuotationRequests = () => {
    try {
        const storedQueue = localStorage.getItem(quotationQueueStorageKey)

        if (!storedQueue) {
            return []
        }

        const parsedQueue = JSON.parse(storedQueue)

        if (!Array.isArray(parsedQueue)) {
            return []
        }

        return parsedQueue as QueuedQuotationRequest[]
    } catch {
        return []
    }
}

const writeQueuedQuotationRequests = (queue: QueuedQuotationRequest[]) => {
    localStorage.setItem(quotationQueueStorageKey, JSON.stringify(queue))
}

const queueQuotationRequest = (request: Omit<QueuedQuotationRequest, "id">, requestId = crypto.randomUUID()) => {
    const queuedRequest = {
        ...request,
        id: requestId,
    } as QueuedQuotationRequest

    writeQueuedQuotationRequests([...readQueuedQuotationRequests(), queuedRequest])
    return queuedRequest
}

const updateQueuedQuotationPost = (
    queuedQuotationId: string,
    payload: Extract<QueuedQuotationRequest, { type: "post" }>["payload"],
) => {
    const queue = readQueuedQuotationRequests()
    let didUpdate = false

    const updatedQueue = queue.map((request) => {
        if (request.id === queuedQuotationId && request.type === "post") {
            didUpdate = true
            return { ...request, payload }
        }

        return request
    })

    writeQueuedQuotationRequests(updatedQueue)
    return didUpdate
}

const removeQueuedQuotationRequest = (queuedQuotationId: string) => {
    const queue = readQueuedQuotationRequests()
    const updatedQueue = queue.filter((request) => request.id !== queuedQuotationId)

    writeQueuedQuotationRequests(updatedQueue)
    return updatedQueue.length !== queue.length
}

const isQueuedQuotationId = (quotationId: string) => quotationId.startsWith("queued-")

const getQueuedDeletedQuotation = (quotationId: string): Quotation => ({
    id: quotationId,
    client_id: "",
    vegetable_id: 0,
    price: 0,
    quotation_date: "",
})

const requestQuotationPost = async (clientId: string, vegetableId: number, price: number, date: string) => {
    const res = await fetch("https://api.vegibec-portail.com/unprotected/quotations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            client_id: clientId,
            vegetable_id: vegetableId,
            price: price,
            quotation_date: date
        })
    })
    return await parseJsonResponse<Quotation>(res)
}

const requestQuotationPatch = async (
    quotationId: string,
    clientId: string,
    vegetableId: number,
    price: number,
    date: string,
) => {
    const res = await fetch(`https://api.vegibec-portail.com/unprotected/quotations/${encodeURIComponent(quotationId)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            client_id: clientId,
            vegetable_id: vegetableId,
            price: price,
            quotation_date: date
        })
    })
    return await parseJsonResponse<Quotation>(res)
}

const requestQuotationDelete = async (quotationId: string) => {
    const res = await fetch(`https://api.vegibec-portail.com/unprotected/quotations/${encodeURIComponent(quotationId)}`, {
        method: "DELETE"
    })
    const data = await parseJsonResponse<{ deleted: Quotation} >(res)
    return data.deleted
}


export const SalesProvider = ({children}: SalesProviderProps) => {
    const [clients, setClients] = useState<Client[]>([])
    const isSyncingQueueRef = useRef(false)

    useEffect(() => {
        fetch("https://api.vegibec-portail.com/unprotected/clients")
        .then(res => res.json())
        .then(data => setClients(data))
    }, [])


    useEffect(() => {
        console.log(clients)
    },[clients])

    const getQuotations = useCallback(async () => {
        const res = await fetch("https://api.vegibec-portail.com/unprotected/quotations")
        return await parseJsonResponse<Quotation[]>(res)
    },[])

    const syncQueuedQuotationRequests = useCallback(async () => {
        if (isSyncingQueueRef.current || !navigator.onLine) {
            return
        }

        isSyncingQueueRef.current = true

        try {
            let queue = readQueuedQuotationRequests()
            let syncedAnyRequest = false

            while (queue.length > 0) {
                const [nextRequest, ...remainingQueue] = queue

                try {
                    if (nextRequest.type === "post") {
                        await requestQuotationPost(
                            nextRequest.payload.clientId,
                            nextRequest.payload.vegetableId,
                            nextRequest.payload.price,
                            nextRequest.payload.date,
                        )
                    } else if (nextRequest.type === "patch") {
                        await requestQuotationPatch(
                            nextRequest.payload.quotationId,
                            nextRequest.payload.clientId,
                            nextRequest.payload.vegetableId,
                            nextRequest.payload.price,
                            nextRequest.payload.date,
                        )
                    } else {
                        await requestQuotationDelete(nextRequest.payload.quotationId)
                    }

                    syncedAnyRequest = true
                    queue = remainingQueue
                    writeQueuedQuotationRequests(queue)
                } catch (error) {
                    if (isNetworkError(error)) {
                        break
                    }

                    queue = remainingQueue
                    writeQueuedQuotationRequests(queue)
                }
            }

            if (syncedAnyRequest) {
                window.dispatchEvent(new Event("sales-quotation-queue-synced"))
            }
        } finally {
            isSyncingQueueRef.current = false
        }
    },[])

    useEffect(() => {
        syncQueuedQuotationRequests()

        window.addEventListener("online", syncQueuedQuotationRequests)

        return () => {
            window.removeEventListener("online", syncQueuedQuotationRequests)
        }
    }, [syncQueuedQuotationRequests])

    const postQuotation = useCallback(async (clientId: string, vegetableId: number, price: number, date: string) => {
        try {
            return await requestQuotationPost(clientId, vegetableId, price, date)
        } catch (error) {
            if (isNetworkError(error)) {
                const queuedRequest = queueQuotationRequest({
                    type: "post",
                    payload: { clientId, vegetableId, price, date },
                }, `queued-${crypto.randomUUID()}`)
                throw new OfflineQueuedRequestError(queuedRequest.id)
            }

            throw error
        }
    },[])

    const patchQuotation = useCallback(async (quotationId: string, clientId: string, vegetableId: number, price: number, date: string) => {
        if (isQueuedQuotationId(quotationId)) {
            updateQueuedQuotationPost(quotationId, { clientId, vegetableId, price, date })
            throw new OfflineQueuedRequestError(quotationId)
        }

        try {
            return await requestQuotationPatch(quotationId, clientId, vegetableId, price, date)
        } catch (error) {
            if (isNetworkError(error)) {
                queueQuotationRequest({
                    type: "patch",
                    payload: { quotationId, clientId, vegetableId, price, date },
                })
                throw new OfflineQueuedRequestError()
            }

            throw error
        }
    },[])

    const deleteQuotation = useCallback(async (quotationId: string) => {
        if (isQueuedQuotationId(quotationId)) {
            removeQueuedQuotationRequest(quotationId)
            return getQueuedDeletedQuotation(quotationId)
        }

        try {
            return await requestQuotationDelete(quotationId)
        } catch (error) {
            if (isNetworkError(error)) {
                queueQuotationRequest({
                    type: "delete",
                    payload: { quotationId },
                })
                throw new OfflineQueuedRequestError()
            }

            throw error
        }
    },[])

    return (
        <SalesContext.Provider value={{clients, setClients, getQuotations, postQuotation, patchQuotation, deleteQuotation}}>
            {children}
        </SalesContext.Provider>
    )
}


// eslint-disable-next-line react-refresh/only-export-components
export const useSales = () => useContext(SalesContext)




