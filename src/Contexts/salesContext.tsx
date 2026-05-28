
import { createContext, useContext, useState, useEffect ,type ReactNode } from "react"


export type Client = {
    id: number,
    name: string,
}


type SalesContextType = {
    clients: Client[],
    setClients: React.Dispatch<React.SetStateAction<Client[]>>
}


type SalesProviderProps = {
    children: ReactNode
}

const SalesContext = createContext<SalesContextType>({} as SalesContextType)


export const SalesProvider = ({children}: SalesProviderProps) => {
    const [clients, setClients] = useState<Client[]>([])

    useEffect(() => {
        fetch("https:/api.vegibec-portail.com/unprotected/clients")
        .then(res => res.json())
        .then(data => setClients(data))
    }, [])


    useEffect(() => {
        console.log(clients)
    },[clients])

    return (
        <SalesContext.Provider value={{clients, setClients}}>
            {children}
        </SalesContext.Provider>
    )
}


// eslint-disable-next-line react-refresh/only-export-components
export const useSales = () => useContext(SalesContext)




