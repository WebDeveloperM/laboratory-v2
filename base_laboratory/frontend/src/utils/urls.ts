const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const INTERNAL_EMPLOYEE_SERVICE_HOSTS = new Set(['host.docker.internal', 'employee-service'])
const EMPLOYEE_SERVICE_MEDIA_PREFIXES = ['/media/employee_base_images/', '/media/user_face_images/']

const resolveBackendApiUrl = () => {
	const configuredApiUrl = String(import.meta.env.VITE_BACKEND_API_URL || '').trim()
	if (configuredApiUrl) {
		return trimTrailingSlash(configuredApiUrl)
	}

	return `https://${window.location.hostname}:8020/api/v1`
}

const resolveEmployeeServiceWebUrl = () => {
	const configuredWebUrl = String(import.meta.env.VITE_EMPLOYEE_SERVICE_WEB_URL || '').trim()
	if (configuredWebUrl) {
		return trimTrailingSlash(configuredWebUrl)
	}

	return `${window.location.protocol}//${window.location.hostname}:5000`
}

const resolveEmployeeServiceApiUrl = (webUrl: string) => {
	const configuredApiUrl = String(import.meta.env.VITE_EMPLOYEE_SERVICE_API_URL || '').trim()
	if (configuredApiUrl) {
		return trimTrailingSlash(configuredApiUrl)
	}

	return `${webUrl}/api/v1`
}

export const BASE_URL = resolveBackendApiUrl()
export const BASE_IMAGE_URL = BASE_URL.replace(/\/api\/v1$/, '')
export const EMPLOYEE_SERVICE_WEB_URL = resolveEmployeeServiceWebUrl()
export const EMPLOYEE_SERVICE_URL = resolveEmployeeServiceApiUrl(EMPLOYEE_SERVICE_WEB_URL)

export const resolveEmployeeImageUrl = (value?: string | null) => {
	const raw = String(value || '').trim()
	if (!raw) {
		return ''
	}

	if (raw.startsWith('data:')) {
		return raw
	}

	if (raw.startsWith('/')) {
		if (EMPLOYEE_SERVICE_MEDIA_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
			return `${EMPLOYEE_SERVICE_WEB_URL}${raw}`
		}
		return `${BASE_IMAGE_URL}${raw}`
	}

	if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
		return `${BASE_IMAGE_URL}/${raw.replace(/^\/+/, '')}`
	}

	try {
		const parsed = new URL(raw)
		if (INTERNAL_EMPLOYEE_SERVICE_HOSTS.has(parsed.hostname)) {
			return `${EMPLOYEE_SERVICE_WEB_URL}${parsed.pathname}${parsed.search}`
		}
		if (parsed.hostname === 'backend') {
			return `${BASE_IMAGE_URL}${parsed.pathname}${parsed.search}`
		}
	} catch {
		return raw
	}

	return raw
}
//  export const BASE_URL = "http://127.0.0.1:8005/api/v1"
//  export const BASE_IMAGE_URL = "http://127.0.0.1:8005"
//export const BASE_URL = "https://inv.bnpz.uz/api/v1"
//export const BASE_IMAGE_URL = "https://inv.bnpz.uz"


