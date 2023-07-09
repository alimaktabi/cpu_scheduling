import { Footer } from "flowbite-react"

const FooterComponent = () => {
  return (
    <Footer container={true}>
      <Footer.Copyright by="Cpu scheduling" year={2022} />
      <Footer.LinkGroup>
        <Footer.Link href="#">
          Created by: "Ali Maktabi & Mohammad Zarei"
        </Footer.Link>
      </Footer.LinkGroup>
    </Footer>
  )
}

export default FooterComponent
