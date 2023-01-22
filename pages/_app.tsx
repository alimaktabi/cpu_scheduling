import "../styles/globals.css"
import type { AppProps } from "next/app"
import { Flowbite } from "flowbite-react"
import Header from "../components/layout/header"
import FooterComponent from "../components/layout/footer"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Flowbite>
      <Header />
      <main className="min-h-screen">
        <Component {...pageProps} />
      </main>
      <FooterComponent />
    </Flowbite>
  )
}
