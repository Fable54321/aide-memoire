import { NavLink, Outlet } from "react-router-dom"


const App = () => {
  return (
    <article className="font-tertiary flex flex-col justify-center items-center mt-5" translate="no">
      <h1 className="text-4xl font-bold text-center" >Aide-mémoire devis</h1>
      <nav className="mt-4 flex gap-2" aria-label="Sections principales">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `button-generic ${isActive ? "outline-2 outline-offset-2 outline-primary" : "opacity-75"}`
          }
        >
          Principal
        </NavLink>
        <NavLink
          to="/rfq"
          className={({ isActive }) =>
            `button-generic ${isActive ? "outline-2 outline-offset-2 outline-primary" : "opacity-75"}`
          }
        >
          RFQ
        </NavLink>
      </nav>
      <Outlet />
    </article>
  )
}

export default App
