import { createMockServices } from './mocks/create-mock-services.ts'

// Shared in-memory demo state. Reloading the page restores the fixtures.
// Replace this adapter with the API in SPEC-009; no real authentication yet.
const mock = createMockServices()
export const portalServices = mock.services
export const mockControls = mock.controls
