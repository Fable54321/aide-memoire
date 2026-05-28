import { Outlet } from "react-router-dom"


const App = () => {
  return (
    <article className="font-tertiary flex flex-col justify-center items-center mt-10">
      <h1 className="text-4xl font-bold text-center" >Aide-mémoire quotations</h1>
      <Outlet />
    </article>
  )
}

export default App
