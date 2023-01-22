import { DarkThemeToggle, Navbar } from "flowbite-react"

const Header = () => {
  return (
    <Navbar fluid={true} rounded={true}>
      <Navbar.Brand>
        <img
          src="https://flowbite.com/docs/images/logo.svg"
          className="mr-3 h-6 sm:h-9"
          alt="Flowbite Logo"
        />
        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
          CPU Scheduling Project
        </span>
      </Navbar.Brand>
      <Navbar.Toggle />
      <Navbar.Collapse>
        <DarkThemeToggle />
      </Navbar.Collapse>
    </Navbar>
  )
}

export default Header
