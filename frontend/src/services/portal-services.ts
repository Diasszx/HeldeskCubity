import { createApiServices } from './api-services.ts'
import { createSessionServices } from './session-services.ts'

export const portalSession = createSessionServices(createApiServices())
export const portalServices = portalSession.services
