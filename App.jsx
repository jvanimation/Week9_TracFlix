import { createContext, useContext, useState } from 'react'
import './App.css'
import TitleList from './Components/TitleList'
import Header from './Components/Header'
import Footer from './Components/Footer'

export const NameContext = createContext()

function App() {

  return (
    <NameContext.Provider value="Justin">
      <Header />
      <TitleList />
      <Footer />
    </NameContext.Provider>
  )
}

export default App
