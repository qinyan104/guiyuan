export function navigateAfterLogin(location: Pick<Location, 'replace'> = window.location): void {
  location.replace('/dashboard')
}
