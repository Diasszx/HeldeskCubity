import { createMockServices } from './mocks/create-mock-services.ts'
import { createSessionServices } from './session-services.ts'

// Shared in-memory demo state. Reloading the page restores the fixtures.
// Replace this adapter with the API in SPEC-009; no real authentication yet.
const mock = createMockServices({ currentUserId: null })
export const portalSession = createSessionServices(mock.services)
export const portalServices = portalSession.services
export const mockControls = mock.controls
