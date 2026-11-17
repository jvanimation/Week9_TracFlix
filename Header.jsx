import { useContext } from "react"
import { NameContext } from "../App"
import TracFlix_Logo from "../assets/TracFlix_Logo.png"

function Header() {
    const { name } = useContext(NameContext)
    return (
        <header>
            <img
                src={TracFlix_Logo}
                alt="TracFlix"
                style={{ height: "100px" }}
            />
            <h2>Keep track of all your streamed shows</h2>    
        </header>
    )
}

export default Header