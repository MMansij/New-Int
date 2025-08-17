import { render, screen } from '@testing-library/react'
import RootLayout from '../layout'

test('layout renders children', () => {
  render(
    <RootLayout>
      <div>Child content</div>
    </RootLayout>
  )
  expect(screen.getByText(/Child content/i)).toBeInTheDocument()
})
