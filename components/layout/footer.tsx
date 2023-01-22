import { Footer } from "flowbite-react"

const FooterComponent = () => {
  return (
    <Footer container={true}>
      <Footer.Copyright href="#" by="Flowbite™" year={2022} />
      <Footer.LinkGroup>
        <Footer.Link href="#">
          Created by: "Ali Maktabi & Sina Amini"
        </Footer.Link>
      </Footer.LinkGroup>
    </Footer>
  )
}

export default FooterComponent
