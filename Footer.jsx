import { useContext } from "react"
import { NameContext } from "../App"

function Footer() {
    const { name } = useContext(NameContext)
    return (
        <>
            <h3 style={{ color: "White" }}>Copyright 2026. All rights reserved.</h3>
        </>
    )
}
export default Footer