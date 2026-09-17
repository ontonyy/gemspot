/* Vitest global setup for component tests: registers jest-dom matchers and
   unmounts any mounted React tree between tests so stores/effects from one
   test can't leak into the next. */
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
