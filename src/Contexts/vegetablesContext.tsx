
import { createContext, useContext, useState, useEffect ,type ReactNode } from "react"


export type Vegetable = {
    id: number,
    vegetable: string,
    sales_debut_1: string,
    sales_debut_2: string,
    sales_end_1: string,
    sales_end_2: string,
    is_generic: boolean
}


type vegetablesContextType = {
    vegetables: Vegetable[],
    setVegetables: React.Dispatch<React.SetStateAction<Vegetable[]>>
}


type vegetablesProviderProps = {
    children: ReactNode
}

const vegetablesContext = createContext<vegetablesContextType>({} as vegetablesContextType)


export const VegetablesProvider = ({children}: vegetablesProviderProps) => {
    const [vegetables, setVegetables] = useState<Vegetable[]>([])

    useEffect(() => {
        fetch("https:/api.vegibec-portail.com/unprotected/vegetables")
        .then(res => res.json())
        .then(data => setVegetables(data))
    }, [])


    useEffect(() => {
        console.log(vegetables)
    },[vegetables])

    return (
        <vegetablesContext.Provider value={{vegetables, setVegetables}}>
            {children}
        </vegetablesContext.Provider>
    )
}


// eslint-disable-next-line react-refresh/only-export-components
export const useVegetables = () => useContext(vegetablesContext)




